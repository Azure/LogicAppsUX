#define _GNU_SOURCE

#include <errno.h>
#include <dirent.h>
#include <fcntl.h>
#include <linux/if_alg.h>
#include <poll.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static volatile sig_atomic_t requested_signal = 0;
static void observe_owned_tree(void);
static void observe_lifecycle_requests(void);
static int signal_owned(pid_t pid, int signal_number);

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
  int extra;
  if (count == capacity && fscanf(stream, "%d", &extra) == 1) count = -1;
  fclose(stream);
  return count;
}

static void reap_exited_children(void) {
  int status = 0;
  while (waitpid(-1, &status, WNOHANG) > 0) {
  }
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
    observe_owned_tree();
    observe_lifecycle_requests();
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
        observe_owned_tree();
        observe_lifecycle_requests();
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
  for (int attempt = 0; attempt < 50 && requested_signal == 0; attempt++) {
    observe_owned_tree();
    observe_lifecycle_requests();
    reap_exited_children();
    count = read_children(owner, children, capacity);
    if (count <= 0) {
      return count;
    }
    sleep_milliseconds(100);
  }
  return read_children(owner, children, capacity);
}

static int terminate_all_descendants(pid_t owner, pid_t *remaining, int capacity) {
  int count = 0;
  for (int attempt = 0; attempt < 100; attempt++) {
    observe_owned_tree();
    reap_exited_children();
    count = read_children(owner, remaining, capacity);
    if (count <= 0) {
      return count;
    }
    for (int index = 0; index < count; index++) {
      signal_owned(remaining[index], SIGKILL);
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

typedef struct {
  pid_t pid;
  unsigned long parent;
  unsigned long long started;
  int captured;
  int admitted;
  int pidfd;
  char state;
  char executable[4096];
  char command_hash[65];
  char payload[4096];
  int argument_count;
} process_diagnostic;

// Never enumerate /proc. Traverse only children of this retained native owner,
// including the task directories of already admitted processes (forking threads).
// Subreaper adoption preserves ancestry when intermediate parents exit.
static process_diagnostic originals[16384];
static int original_count;
static int ownership_failed;
static char boot_id[64];
static const char *lifecycle_directory;

static int read_stat(pid_t pid, process_diagnostic *result) {
  char stat_path[128];
  char stat_text[4096];
  snprintf(stat_path, sizeof(stat_path), "/proc/%d/stat", pid);
  FILE *stat_stream = fopen(stat_path, "r");
  if (!stat_stream || !fgets(stat_text, sizeof(stat_text), stat_stream)) {
    if (stat_stream) fclose(stat_stream);
    return -1;
  }
  fclose(stat_stream);
  char *fields = strrchr(stat_text, ')');
  char *save = NULL;
  char *token = fields ? strtok_r(fields + 1, " ", &save) : NULL;
  for (int field = 0; token && field <= 19; field++, token = strtok_r(NULL, " ", &save)) {
    if (field == 0) result->state = token[0];
    if (field == 1) result->parent = strtoul(token, NULL, 10);
    if (field == 19) result->started = strtoull(token, NULL, 10);
  }
  return result->started > 0 ? 0 : -1;
}

static int exited(process_diagnostic *record) {
  struct pollfd descriptor = { .fd = record->pidfd, .events = POLLIN };
  return record->pidfd >= 0 && poll(&descriptor, 1, 0) == 1 && (descriptor.revents & POLLIN);
}

static int hash_command(const unsigned char *bytes, size_t length, char *hash) {
  // AF_ALG is the Linux kernel SHA-256 API; no openssl executable/package or
  // command-line disclosure. Missing kernel support is an explicit capture failure.
  int algorithm = socket(AF_ALG, SOCK_SEQPACKET | SOCK_CLOEXEC, 0);
  if (algorithm < 0) return -1;
  struct sockaddr_alg address = { .salg_family = AF_ALG };
  strcpy((char *)address.salg_type, "hash");
  strcpy((char *)address.salg_name, "sha256");
  int operation = -1, result = -1;
  if (bind(algorithm, (struct sockaddr *)&address, sizeof(address)) != 0) goto finish;
  operation = accept4(algorithm, NULL, NULL, SOCK_CLOEXEC);
  if (operation < 0) goto finish;
  size_t offset = 0;
  while (offset < length) {
    size_t chunk = length - offset > 16384 ? 16384 : length - offset;
    ssize_t written = send(operation, bytes + offset, chunk, offset + chunk < length ? MSG_MORE : 0);
    if (written != (ssize_t)chunk) goto finish;
    offset += chunk;
  }
  unsigned char digest[32];
  if (read(operation, digest, sizeof(digest)) != sizeof(digest)) goto finish;
  for (int i = 0; i < 32; i++) snprintf(hash + i * 2, 3, "%02x", digest[i]);
  result = 0;
finish:
  if (operation >= 0) close(operation);
  close(algorithm);
  return result;
}

static int admitted_ancestry(pid_t pid) {
  for (int depth = 0; depth < 256; depth++) {
    process_diagnostic current = {0};
    if (read_stat(pid, &current) != 0) return 0;
    if (current.parent == (unsigned long)getpid()) return 1;
    if (current.parent == 0 || current.parent == (unsigned long)pid) return 0;
    pid = (pid_t)current.parent;
  }
  return 0;
}

static void capture_process(process_diagnostic *record) {
  record->captured = 0;
  record->payload[0] = '\0';
  record->argument_count = 0;
  // Revalidate pinned native ancestry before inspecting a command. A child-link
  // race must not admit an unrelated process that reused the numeric PID.
  if (exited(record) || !admitted_ancestry(record->pid)) return;
  char file[128];
  snprintf(file, sizeof(file), "/proc/%d", record->pid);
  int proc = open(file, O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW);
  // A pinned proc directory cannot resolve files of a reused PID. Verify the
  // pidfd is still live after opening it, before reading executable/command.
  if (proc < 0) return;
  if (exited(record)) { close(proc); return; }
  ssize_t size = readlinkat(proc, "exe", record->executable, sizeof(record->executable) - 1);
  if (size <= 0 || size >= (ssize_t)sizeof(record->executable) - 1) { close(proc); return; }
  record->executable[size] = '\0';
  int descriptor = openat(proc, "cmdline", O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
  if (descriptor < 0) { close(proc); return; }
  size_t capacity = 4 * 1024 * 1024;
  unsigned char *command = malloc(capacity + 1);
  if (!command) { close(descriptor); close(proc); return; }
  size_t length = 0;
  ssize_t count;
  while (length < capacity && (count = read(descriptor, command + length, capacity + 1 - length)) > 0) {
    length += (size_t)count;
  }
  close(descriptor);
  if (length == 0 || length >= capacity || command[length - 1] != '\0' || count < 0) goto finish;
  for (size_t i = 0; i < length; i++) if (!command[i]) record->argument_count++;
  // Retain argv[0] only; arbitrary secret-bearing arguments are hashed, not emitted.
  if (command[0] == '/' && strlen((char *)command) < sizeof(record->payload))
    strcpy(record->payload, (char *)command);
  process_diagnostic after = {0};
  char executable_after[4096];
  ssize_t executable_size = readlinkat(proc, "exe", executable_after, sizeof(executable_after) - 1);
  if (executable_size <= 0 || executable_size >= (ssize_t)sizeof(executable_after) - 1) goto finish;
  executable_after[executable_size] = '\0';
  if (hash_command(command, length, record->command_hash) == 0 &&
      read_stat(record->pid, &after) == 0 && after.started == record->started &&
      strcmp(executable_after, record->executable) == 0 && !exited(record) && boot_id[0])
    record->captured = 1;
finish:
  free(command);
  close(proc);
}

static process_diagnostic *retained(pid_t pid) {
  for (int i = original_count - 1; i >= 0; i--) if (originals[i].pid == pid) return &originals[i];
  return NULL;
}

static void visit_owned(pid_t pid, int depth) {
  if (depth > 256) { ownership_failed = 1; return; }
  process_diagnostic *record = retained(pid);
  if (record && exited(record)) {
    process_diagnostic current = {0};
    if (read_stat(pid, &current) != 0 || current.started == record->started) return;
  }
  if (!record || record->pidfd < 0 || exited(record)) {
    if (original_count == 16384) { ownership_failed = 1; return; }
    // Admission came from the native owner's child links BEFORE reading stat,
    // executable or command. pidfd pins that original identity across PID reuse.
    record = &originals[original_count++];
    *record = (process_diagnostic){ .pid = pid, .pidfd = -1, .admitted = 1 };
    record->pidfd = (int)syscall(SYS_pidfd_open, pid, 0);
    if (record->pidfd < 0) { if (errno != ESRCH) ownership_failed = 1; return; }
    if (read_stat(pid, record) != 0) { if (!exited(record)) ownership_failed = 1; return; }
  }
  if (exited(record)) return;
  capture_process(record); // exec may change the image, never the pinned creation.
  char task_path[128];
  snprintf(task_path, sizeof(task_path), "/proc/%d/task", pid);
  DIR *tasks = opendir(task_path);
  if (!tasks) { if (!exited(record)) ownership_failed = 1; return; }
  struct dirent *entry;
  while ((entry = readdir(tasks))) {
    char *end;
    long tid = strtol(entry->d_name, &end, 10);
    if (*end || tid <= 0) continue;
    char file[160];
    snprintf(file, sizeof(file), "/proc/%d/task/%ld/children", pid, tid);
    FILE *stream = fopen(file, "r");
    if (!stream) continue; // A thread may have exited; adoption is checked next.
    pid_t child;
    while (fscanf(stream, "%d", &child) == 1) visit_owned(child, depth + 1);
    fclose(stream);
  }
  closedir(tasks);
}

static void observe_owned_tree(void) {
  pid_t children[4096];
  int count = read_children(getpid(), children, 4096);
  if (count < 0) { ownership_failed = 1; return; }
  for (int i = 0; i < count; i++) visit_owned(children[i], 0);
}

static void json_string(FILE *stream, const char *text) {
  fputc('"', stream);
  for (const unsigned char *p = (const unsigned char *)text; *p; p++) {
    if (*p == '"' || *p == '\\') fprintf(stream, "\\%c", *p);
    else if (*p < 32 || *p >= 127) fprintf(stream, "\\u%04x", *p);
    else fputc(*p, stream);
  }
  fputc('"', stream);
}

static void utc_now(char *output, size_t capacity) {
  struct timespec now;
  struct tm utc;
  clock_gettime(CLOCK_REALTIME, &now);
  gmtime_r(&now.tv_sec, &utc);
  size_t length = strftime(output, capacity, "%Y-%m-%dT%H:%M:%S", &utc);
  snprintf(output + length, capacity - length, ".%03ldZ", now.tv_nsec / 1000000);
}

static process_diagnostic read_process_diagnostic(pid_t pid) {
  process_diagnostic *record = retained(pid);
  return record ? *record : (process_diagnostic){ .pid = pid, .pidfd = -1 };
}

static int signal_owned(pid_t pid, int signal_number) {
  process_diagnostic *record = retained(pid);
  if (!record || record->pidfd < 0) return -1;
  return (int)syscall(SYS_pidfd_send_signal, record->pidfd, signal_number, NULL, 0);
}

static void write_process_diagnostic(FILE *stream, process_diagnostic record, int live_probe) {
  if (live_probe && record.pidfd >= 0 && exited(&record)) {
    fprintf(stream, "{\"pid\":%d,\"metadataStatus\":\"exited-before-inspection\"}", record.pid);
    return;
  }
  if (!record.captured) {
    fprintf(stream, "{\"pid\":%d,\"metadataStatus\":\"%s\"}", record.pid,
            record.admitted ? "inspection-failed" : "not-in-containment");
    return;
  }
  fprintf(stream,
          "{\"pid\":%d,\"metadataStatus\":\"captured\",\"parentPid\":%lu,\"startTimeTicks\":\"%llu\","
          "\"identity\":{\"platform\":\"linux\",\"kind\":\"linux-proc-start\",\"startTimeTicks\":\"%llu\",\"bootId\":",
          record.pid, record.parent, record.started, record.started);
  json_string(stream, boot_id);
  fprintf(stream, ",\"clockTicksPerSecond\":%ld},\"executablePath\":", sysconf(_SC_CLK_TCK));
  json_string(stream, record.executable);
  fprintf(stream, ",\"commandSummary\":{\"argumentCount\":%d,\"safeMarkers\":[],\"scriptOrModuleBasenames\":[],"
          "\"sha256\":", record.argument_count);
  json_string(stream, record.command_hash);
  fprintf(stream, ",\"hashEncoding\":\"linux-proc-cmdline-nul-bytes\",\"payloadPaths\":[");
  if (record.payload[0]) json_string(stream, record.payload);
  fprintf(stream, "]}}");
}

// Search fd links only for already retained identities, never enumerate /proc.
// The namespace TCP table supplies only the explicitly requested port's inode.
static int owns_socket(process_diagnostic *record, unsigned long inode) {
  if (!record->captured || exited(record)) return 0;
  char file[128], expected[64];
  snprintf(file, sizeof(file), "/proc/%d", record->pid);
  int proc = open(file, O_RDONLY | O_DIRECTORY | O_CLOEXEC);
  process_diagnostic before = {0}, after = {0};
  if (proc < 0) return 0;
  if (read_stat(record->pid, &before) != 0 || before.started != record->started || exited(record)) {
    close(proc); return 0;
  }
  int fd = openat(proc, "fd", O_RDONLY | O_DIRECTORY | O_CLOEXEC);
  close(proc);
  if (fd < 0) return 0;
  DIR *directory = fdopendir(fd);
  if (!directory) { close(fd); return 0; }
  snprintf(expected, sizeof(expected), "socket:[%lu]", inode);
  int matched = 0;
  struct dirent *entry;
  while ((entry = readdir(directory))) {
    char link[128];
    ssize_t size = readlinkat(dirfd(directory), entry->d_name, link, sizeof(link) - 1);
    if (size <= 0 || size >= (ssize_t)sizeof(link) - 1) continue;
    link[size] = '\0';
    if (!strcmp(link, expected)) matched = 1;
  }
  closedir(directory);
  return matched && read_stat(record->pid, &after) == 0 && after.started == record->started && !exited(record);
}

static void write_listener_diagnostics(FILE *stream, const unsigned int *ports, int port_count, const pid_t *roots, int root_count) {
  FILE *table = fopen("/proc/net/tcp", "r");
  if (!table) { fprintf(stream, "null"); return; } // Explicitly unavailable, never HTTP-only fallback.
  fprintf(stream, "[");
  char line[1024];
  int written = 0;
  while (fgets(line, sizeof(line), table)) {
    unsigned int address, port, state;
    unsigned long inode;
    if (sscanf(line, "%*u: %x:%x %*x:%*x %x %*s %*s %*s %*u %*u %lu", &address, &port, &state, &inode) != 4) continue;
    if (state != 10 || (address != 0 && address != 0x0100007f)) continue;
    int requested = 0;
    for (int i = 0; i < port_count; i++) if (ports[i] == port) requested = 1;
    if (!requested) continue;
    process_diagnostic *owner = NULL;
    int owners = 0;
    for (int i = 0; i < original_count; i++) {
      if (owns_socket(&originals[i], inode)) { owner = &originals[i]; owners++; }
    }
    if (written++) fputc(',', stream);
    fprintf(stream, "{\"port\":%u,\"pid\":", port);
    if (owners == 1) fprintf(stream, "%d", owner->pid); else fprintf(stream, "null");
    process_diagnostic *ancestry[64];
    int count = 0, matched = 0;
    process_diagnostic *current = owners == 1 ? owner : NULL;
    while (current && count < 64 && current->captured && !exited(current)) {
      int cycle = 0;
      for (int i = 0; i < count; i++) if (ancestry[i] == current) cycle = 1;
      if (cycle) break;
      ancestry[count++] = current;
      for (int i = 0; i < root_count; i++) if (roots[i] == current->pid) matched = current->pid;
      if (matched) break;
      current = retained((pid_t)current->parent);
    }
    fprintf(stream, ",\"matchedRoot\":");
    if (matched) fprintf(stream, "%d", matched); else fprintf(stream, "null");
    fprintf(stream, ",\"ancestry\":[");
    for (int i = 0; i < count; i++) {
      if (i) fputc(',', stream);
      write_process_diagnostic(stream, *ancestry[i], 1);
    }
    fprintf(stream, "]}");
  }
  fclose(table);
  fprintf(stream, "]");
}

static void observe_lifecycle_requests(void) {
  if (!lifecycle_directory) return;
  DIR *directory = opendir(lifecycle_directory);
  if (!directory) { ownership_failed = 1; return; }
  struct dirent *entry;
  while ((entry = readdir(directory))) {
    size_t length = strlen(entry->d_name);
    if (length < 9 || strcmp(entry->d_name + length - 8, ".request")) continue;
    int fd = openat(dirfd(directory), entry->d_name, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    struct stat stat;
    if (fd < 0 || fstat(fd, &stat) != 0 || !S_ISREG(stat.st_mode) || stat.st_size > 1024) {
      if (fd >= 0) close(fd);
      ownership_failed = 1;
      continue;
    }
    FILE *request = fdopen(fd, "r");
    if (!request) { close(fd); ownership_failed = 1; continue; }
    pid_t ids[64];
    int count = 0, invalid = 0;
    unsigned int ports[64];
    int port_count = 0;
    char line[64];
    while (fgets(line, sizeof(line), request)) {
      if (!strncmp(line, "port:", 5)) {
        char *end;
        long port = strtol(line + 5, &end, 10);
        if (port <= 0 || port > 65535 || (*end && strcmp(end, "\n")) || port_count == 64) { invalid = 1; break; }
        ports[port_count++] = (unsigned int)port;
        continue;
      }
      char *end;
      long id = strtol(line, &end, 10);
      if (id <= 0 || id > 2147483647 || (*end && strcmp(end, "\n")) || count == 64) { invalid = 1; break; }
      ids[count++] = (pid_t)id;
    }
    fclose(request);
    char response[4096], temporary[4096], timestamp[64];
    if (snprintf(response, sizeof(response), "%s/%s.response", lifecycle_directory, entry->d_name) >= (int)sizeof(response) ||
        snprintf(temporary, sizeof(temporary), "%s.tmp", response) >= (int)sizeof(temporary)) { ownership_failed = 1; continue; }
    FILE *stream = fopen(temporary, "wx");
    if (!stream) { ownership_failed = 1; continue; }
    utc_now(timestamp, sizeof(timestamp));
    fprintf(stream, "{\"observedAtUtc\":\"%s\",\"ownershipComplete\":%s,\"processes\":[",
            timestamp, !invalid && !ownership_failed ? "true" : "false");
    for (int i = 0; i < count; i++) {
      if (i) fputc(',', stream);
      write_process_diagnostic(stream, read_process_diagnostic(ids[i]), 1);
    }
    fprintf(stream, "]");
    if (port_count) {
      fprintf(stream, ",\"requestedPorts\":[");
      for (int i = 0; i < port_count; i++) { if (i) fputc(',', stream); fprintf(stream, "%u", ports[i]); }
      fprintf(stream, "],\"listeners\":");
      write_listener_diagnostics(stream, ports, port_count, ids, count);
    }
    fprintf(stream, "}\n");
    int failed = fflush(stream) != 0;
    if (fsync(fileno(stream)) != 0) failed = 1;
    if (fclose(stream) != 0) failed = 1;
    if (failed || rename(temporary, response) != 0) ownership_failed = 1;
    else unlinkat(dirfd(directory), entry->d_name, 0);
  }
  closedir(directory);
}

static int write_receipt(const char *path, pid_t root_pid, int root_exit_code, int root_signal, const pid_t *escaped, int escaped_count,
                         const process_diagnostic *diagnostics, int recovery_attempted, int remaining_count, const char *captured_at) {
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
      ",\"metadataCapturedAtUtc\":\"%s\",\"ownershipComplete\":%s,"
      "\"containmentEmpty\":%s,\"retainedOriginalIdentitiesVerified\":%s,\"escapedDescendants\":[",
      captured_at, ownership_failed ? "false" : "true",
      escaped_count == 0 ? "true" : "false",
      escaped_count == 0 && !recovery_attempted && !ownership_failed ? "true" : "false");
  // Original survivors are in activeContainedProcesses. escapedDescendants is
  // the post-recovery remainder, matching Windows recovery semantics.
  if (remaining_count > 0) {
    for (int index = 0; index < escaped_count; index++)
      fprintf(stream, "%s%d", index == 0 ? "" : ",", escaped[index]);
  }
  fprintf(stream, "],\"activeContainedProcesses\":[");
  int diagnostic_count = escaped_count > 32 ? 32 : escaped_count;
  for (int index = 0; index < diagnostic_count; index++) {
    if (index > 0) fprintf(stream, ",");
    process_diagnostic record = diagnostics[index].pid == escaped[index] ? diagnostics[index] : read_process_diagnostic(escaped[index]);
    write_process_diagnostic(stream, record, 0);
  }
  fprintf(stream,
          "],\"activeContainedProcessesTruncated\":%s,\"activeContainedProcessCount\":%d,"
          "\"forcedTerminationAttempted\":%s,\"forcedTerminationSucceeded\":%s,\"postTerminationActiveProcessCount\":%d}\n",
          escaped_count > 32 ? "true" : "false", escaped_count,
          recovery_attempted ? "true" : "false",
          recovery_attempted && remaining_count == 0 ? "true" : "false", remaining_count);
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
  lifecycle_directory = getenv("LA_E2E_LIFECYCLE_DIR");
  FILE *boot = fopen("/proc/sys/kernel/random/boot_id", "r");
  if (boot) { if (!fgets(boot_id, sizeof(boot_id), boot)) boot_id[0] = '\0'; fclose(boot); }
  boot_id[strcspn(boot_id, "\r\n")] = '\0';
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
    const char *directory = getenv("LA_E2E_LIFECYCLE_DIR");
    const char *invocation = getenv("LA_E2E_LIFECYCLE_INVOCATION");
    if (directory && invocation) {
      char binding_path[4096];
      if (snprintf(binding_path, sizeof(binding_path), "%s/binding.json", directory) >= (int)sizeof(binding_path)) _exit(126);
      FILE *binding = fopen(binding_path, "wx");
      if (!binding) _exit(126);
      // The owner supplies a UUID, never freeform command text.
      if (strspn(invocation, "0123456789abcdef-") != strlen(invocation)) _exit(126);
      fprintf(binding, "{\"rootPid\":%d,\"invocation\":\"%s\"}", getpid(), invocation);
      if (fclose(binding) != 0) _exit(126);
    }
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
  int recovery_attempted = 0;
  int remaining_count = 0;
  process_diagnostic diagnostics[32] = {{0}};
  char captured_at[64];

  if (requested_signal != 0) {
    recovery_attempted = 1;
    reap_exited_children();
    escaped_count = read_children(getpid(), escaped, 4096);
  } else {
    escaped_count = wait_for_natural_descendant_exit(getpid(), escaped, 4096);
    if (requested_signal != 0) {
      recovery_attempted = 1;
    }
  }
  if (escaped_count < 0) {
    return 126;
  }

  observe_owned_tree();
  observe_lifecycle_requests();
  // Count every retained live descendant, not only direct adopted children.
  // Recovery still signals only native-owned pidfds and reaps adopted children.
  escaped_count = 0;
  for (int i = 0; i < original_count; i++) {
    if (originals[i].pidfd >= 0 && !exited(&originals[i])) {
      if (escaped_count == 4096) { ownership_failed = 1; break; }
      escaped[escaped_count++] = originals[i].pid;
    }
  }
  // The retained command/creation snapshot and timestamp precede all recovery.
  utc_now(captured_at, sizeof(captured_at));
  if (escaped_count > 0 || recovery_attempted) {
    recovery_attempted = 1;
    for (int index = 0; index < escaped_count && index < 32; index++) {
      diagnostics[index] = read_process_diagnostic(escaped[index]);
    }
    pid_t remaining[4096];
    remaining_count = terminate_all_descendants(getpid(), remaining, 4096);
    if (remaining_count < 0) {
      return 126;
    }
  }

  if (write_receipt(receipt_path, root_pid, root_exit_code, root_signal, escaped, escaped_count, diagnostics,
                    recovery_attempted, remaining_count, captured_at) != 0) {
    return 126;
  }
  if (recovery_attempted) {
    return 125;
  }
  if (root_signal != 0) {
    return 128 + root_signal;
  }
  return root_exit_code;
}
