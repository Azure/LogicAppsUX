#define _GNU_SOURCE

#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static volatile sig_atomic_t requested_signal = 0;
static const int CONTAINMENT_DRAIN_ATTEMPTS = 300;
static const long CONTAINMENT_DRAIN_DELAY_MS = 100;

static void request_termination(int signal_number) {
  if (requested_signal == 0) {
    requested_signal = signal_number;
  }
}

static int install_signal_handlers(void) {
  struct sigaction action = {0};
  action.sa_handler = request_termination;
  sigemptyset(&action.sa_mask);
  return sigaction(SIGTERM, &action, NULL) == 0 &&
         sigaction(SIGINT, &action, NULL) == 0 &&
         sigaction(SIGHUP, &action, NULL) == 0
             ? 0
             : -1;
}

static void reset_signal_handlers(void) {
  signal(SIGTERM, SIG_DFL);
  signal(SIGINT, SIG_DFL);
  signal(SIGHUP, SIG_DFL);
}

static int read_children(pid_t owner, pid_t *children, int capacity) {
  char path[128];
  snprintf(path, sizeof(path), "/proc/%d/task/%d/children", owner, owner);
  FILE *stream = fopen(path, "r");
  if (!stream) {
    return -1;
  }
  int count = 0;
  while (count < capacity && fscanf(stream, "%d", &children[count]) == 1) {
    count++;
  }
  fclose(stream);
  return count;
}

static void reap_exited_children(void) {
  int status = 0;
  while (waitpid(-1, &status, WNOHANG) > 0) {
  }
}

static void report_residual_descendant(pid_t pid) {
  char path[128];
  snprintf(path, sizeof(path), "/proc/%d/stat", pid);
  FILE *stream = fopen(path, "r");
  if (!stream) {
    fprintf(stderr, "[containment] residual pid=%d metadata=unavailable\n", pid);
    return;
  }
  int parsed_pid = 0;
  int parent_pid = 0;
  int process_group_id = 0;
  int session_id = 0;
  char name[256] = {0};
  char state = '?';
  int fields = fscanf(stream, "%d (%255[^)]) %c %d %d %d", &parsed_pid, name, &state, &parent_pid, &process_group_id, &session_id);
  fclose(stream);
  if (fields != 6) {
    fprintf(stderr, "[containment] residual pid=%d metadata=malformed\n", pid);
    return;
  }
  fprintf(
      stderr,
      "[containment] residual pid=%d ppid=%d pgrp=%d session=%d state=%c name=%s\n",
      parsed_pid,
      parent_pid,
      process_group_id,
      session_id,
      state,
      name);
}

static void sleep_milliseconds(long milliseconds) {
  struct timespec duration = {
      .tv_sec = milliseconds / 1000,
      .tv_nsec = (milliseconds % 1000) * 1000000L,
  };
  while (nanosleep(&duration, &duration) == -1 && errno == EINTR) {
  }
}

static int wait_for_root(pid_t root_pid, int *root_status) {
  int forwarded_signal = 0;
  for (;;) {
    pid_t result = waitpid(root_pid, root_status, WNOHANG);
    if (result == root_pid) {
      return 0;
    }
    if (result < 0 && errno != EINTR) {
      return -1;
    }
    if (requested_signal != 0 && forwarded_signal == 0) {
      forwarded_signal = requested_signal;
      kill(-root_pid, forwarded_signal);
      kill(root_pid, forwarded_signal);
    }
    if (forwarded_signal != 0) {
      for (int attempt = 0; attempt < 40; attempt++) {
        result = waitpid(root_pid, root_status, WNOHANG);
        if (result == root_pid) {
          return 0;
        }
        if (result < 0 && errno != EINTR) {
          return -1;
        }
        sleep_milliseconds(100);
      }
      kill(-root_pid, SIGKILL);
      kill(root_pid, SIGKILL);
      while (waitpid(root_pid, root_status, 0) < 0) {
        if (errno != EINTR) {
          return -1;
        }
      }
      return 0;
    }
    sleep_milliseconds(100);
  }
}

static int wait_for_natural_descendant_exit(pid_t owner, pid_t *children, int capacity) {
  int count = 0;
  for (int attempt = 0; attempt < CONTAINMENT_DRAIN_ATTEMPTS && requested_signal == 0; attempt++) {
    reap_exited_children();
    count = read_children(owner, children, capacity);
    if (count <= 0) {
      return count;
    }
    sleep_milliseconds(CONTAINMENT_DRAIN_DELAY_MS);
  }
  return read_children(owner, children, capacity);
}

static int terminate_all_descendants(pid_t owner, pid_t *remaining, int capacity) {
  int count = 0;
  for (int attempt = 0; attempt < 100; attempt++) {
    reap_exited_children();
    count = read_children(owner, remaining, capacity);
    if (count <= 0) {
      return count;
    }
    for (int index = 0; index < count; index++) {
      kill(remaining[index], SIGKILL);
    }
    sleep_milliseconds(50);
  }
  reap_exited_children();
  return read_children(owner, remaining, capacity);
}

static const char *signal_name(int signal_number) {
  switch (signal_number) {
  case SIGHUP:
    return "SIGHUP";
  case SIGTERM:
    return "SIGTERM";
  case SIGKILL:
    return "SIGKILL";
  case SIGINT:
    return "SIGINT";
  case SIGABRT:
    return "SIGABRT";
  case SIGSEGV:
    return "SIGSEGV";
  default:
    return "UNKNOWN";
  }
}

static int write_receipt(const char *path, pid_t root_pid, int root_exit_code, int root_signal, const pid_t *escaped, int escaped_count) {
  size_t temporary_path_size = strlen(path) + 32;
  char *temporary_path = malloc(temporary_path_size);
  if (!temporary_path) {
    return -1;
  }
  snprintf(temporary_path, temporary_path_size, "%s.tmp.%d", path, getpid());
  FILE *stream = fopen(temporary_path, "w");
  if (!stream) {
    free(temporary_path);
    return -1;
  }
  fprintf(
      stream,
      "{\"schemaVersion\":1,\"mechanism\":\"linux-subreaper\",\"containmentEstablished\":true,"
      "\"rootPid\":%d,\"rootExitCode\":%d,\"rootSignal\":",
      root_pid,
      root_exit_code);
  if (root_signal == 0) {
    fprintf(stream, "null");
  } else {
    fprintf(stream, "\"%s\"", signal_name(root_signal));
  }
  fprintf(
      stream,
      ",\"containmentEmpty\":%s,\"retainedOriginalIdentitiesVerified\":%s,\"escapedDescendants\":[",
      escaped_count == 0 ? "true" : "false",
      escaped_count == 0 ? "true" : "false");
  for (int index = 0; index < escaped_count; index++) {
    fprintf(stream, "%s%d", index == 0 ? "" : ",", escaped[index]);
  }
  fprintf(stream, "]}\n");
  int failed = fflush(stream) != 0;
  if (fsync(fileno(stream)) != 0) {
    failed = 1;
  }
  if (fclose(stream) != 0) {
    failed = 1;
  }
  if (!failed && rename(temporary_path, path) != 0) {
    failed = 1;
  }
  if (failed) {
    unlink(temporary_path);
  }
  free(temporary_path);
  return failed ? -1 : 0;
}

int main(int argc, char **argv) {
  if (argc < 3 || install_signal_handlers() != 0) {
    return 126;
  }
  const char *receipt_path = argv[1];
  if (prctl(PR_SET_CHILD_SUBREAPER, 1) != 0) {
    return 126;
  }

  pid_t root_pid = fork();
  if (root_pid < 0) {
    return 126;
  }
  if (root_pid == 0) {
    reset_signal_handlers();
    setpgid(0, 0);
    execvp(argv[2], &argv[2]);
    _exit(127);
  }
  if (setpgid(root_pid, root_pid) != 0 && errno != EACCES && errno != ESRCH) {
    kill(root_pid, SIGKILL);
    return 126;
  }

  int root_status = 0;
  if (wait_for_root(root_pid, &root_status) != 0) {
    return 126;
  }

  int root_exit_code = WIFEXITED(root_status) ? WEXITSTATUS(root_status) : 1;
  int root_signal = WIFSIGNALED(root_status) ? WTERMSIG(root_status) : 0;
  pid_t escaped[4096];
  int escaped_count = 0;

  if (requested_signal != 0) {
    escaped_count = terminate_all_descendants(getpid(), escaped, 4096);
  } else {
    escaped_count = wait_for_natural_descendant_exit(getpid(), escaped, 4096);
    if (requested_signal != 0) {
      escaped_count = terminate_all_descendants(getpid(), escaped, 4096);
    } else if (escaped_count > 0) {
      for (int index = 0; index < escaped_count; index++) {
        report_residual_descendant(escaped[index]);
      }
      pid_t remaining[4096];
      terminate_all_descendants(getpid(), remaining, 4096);
    }
  }
  if (escaped_count < 0) {
    return 126;
  }

  if (write_receipt(receipt_path, root_pid, root_exit_code, root_signal, escaped, escaped_count) != 0) {
    return 126;
  }
  if (escaped_count > 0) {
    return 125;
  }
  if (root_signal != 0) {
    return 128 + root_signal;
  }
  return root_exit_code;
}
