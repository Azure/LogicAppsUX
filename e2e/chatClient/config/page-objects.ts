/**
 * Page Object Models for A2A Chat E2E tests
 *
 * Provides high-level interfaces for interacting with chat UI
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  waitForVisible,
  typeRealistic,
  waitForCondition,
  getCount,
  getAllInnerTexts,
} from '../utils/test-helpers';

/**
 * Chat Page Object
 *
 * Encapsulates all interactions with the chat interface
 */
export class ChatPage {
  readonly page: Page;

  // Locators
  readonly chatContainer: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messages: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;
  readonly typingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.chatContainer = page.locator('[data-testid="chat-container"]');
    this.messageInput = page.locator('[data-testid="message-input"]');
    this.sendButton = page.locator('[data-testid="send-button"]');
    this.messages = page.locator('[data-testid="message"]');
    this.userMessages = page.locator('[data-testid="message"][data-role="user"]');
    this.assistantMessages = page.locator('[data-testid="message"][data-role="assistant"]');
    this.loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.retryButton = page.locator('[data-testid="retry-button"]');
    this.typingIndicator = page.locator('[data-testid="typing-indicator"]');
  }

  /**
   * Navigate to chat page
   */
  async goto(url = '/') {
    await this.page.goto(url);
    await this.waitForChatReady();
  }

  /**
   * Wait for chat to be ready
   */
  async waitForChatReady() {
    await waitForVisible(this.chatContainer);
    await waitForVisible(this.messageInput);
    await expect(this.sendButton).toBeDisabled(); // Initially disabled with no input
  }

  /**
   * Type a message in the input
   */
  async typeMessage(message: string, realistic = false) {
    if (realistic) {
      await typeRealistic(this.messageInput, message);
    } else {
      await this.messageInput.fill(message);
    }
  }

  /**
   * Send a message
   */
  async sendMessage(message: string, options?: { realistic?: boolean }) {
    await this.typeMessage(message, options?.realistic);
    await this.clickSend();
  }

  /**
   * Click send button
   */
  async clickSend() {
    await expect(this.sendButton).toBeEnabled();
    await this.sendButton.click();
  }

  /**
   * Wait for message to appear in chat
   */
  async waitForMessage(text: string | RegExp, options?: { timeout?: number }) {
    const message = this.messages.filter({ hasText: text });
    await waitForVisible(message.first(), options);
  }

  /**
   * Wait for assistant response
   */
  async waitForAssistantResponse(options?: { timeout?: number }) {
    // Wait for loading indicator to appear and disappear
    await waitForVisible(this.loadingIndicator, { timeout: 1000 }).catch(() => {
      // Loading indicator might be too fast to catch
    });

    // Wait for loading to disappear
    await expect(this.loadingIndicator).toBeHidden(options);

    // Wait for at least one assistant message
    await expect(this.assistantMessages.first()).toBeVisible(options);
  }

  /**
   * Get all message texts
   */
  async getAllMessageTexts(): Promise<string[]> {
    return getAllInnerTexts(this.messages);
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    return getCount(this.messages);
  }

  /**
   * Get user message count
   */
  async getUserMessageCount(): Promise<number> {
    return getCount(this.userMessages);
  }

  /**
   * Get assistant message count
   */
  async getAssistantMessageCount(): Promise<number> {
    return getCount(this.assistantMessages);
  }

  /**
   * Check if loading indicator is visible
   */
  async isLoading(): Promise<boolean> {
    return this.loadingIndicator.isVisible();
  }

  /**
   * Check if send button is enabled
   */
  async isSendEnabled(): Promise<boolean> {
    return this.sendButton.isEnabled();
  }

  /**
   * Check if error is displayed
   */
  async isErrorDisplayed(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorText(): Promise<string | null> {
    if (await this.isErrorDisplayed()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Click retry button
   */
  async clickRetry() {
    await expect(this.retryButton).toBeVisible();
    await this.retryButton.click();
  }

  /**
   * Wait for typing indicator
   */
  async waitForTyping() {
    await waitForVisible(this.typingIndicator, { timeout: 2000 });
  }

  /**
   * Wait for typing to stop
   */
  async waitForTypingToStop() {
    await expect(this.typingIndicator).toBeHidden({ timeout: 5000 });
  }

  /**
   * Clear input
   */
  async clearInput() {
    await this.messageInput.clear();
  }

  /**
   * Get input value
   */
  async getInputValue(): Promise<string> {
    return this.messageInput.inputValue();
  }

  /**
   * Focus input
   */
  async focusInput() {
    await this.messageInput.focus();
  }

  /**
   * Press Enter to send
   */
  async pressEnterToSend() {
    await this.messageInput.press('Enter');
  }

  /**
   * Press Shift+Enter for new line
   */
  async pressShiftEnter() {
    await this.messageInput.press('Shift+Enter');
  }

  /**
   * Scroll to bottom of chat
   */
  async scrollToBottom() {
    await this.chatContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  }

  /**
   * Get scroll position
   */
  async getScrollPosition(): Promise<number> {
    return this.chatContainer.evaluate((el) => el.scrollTop);
  }

  /**
   * Check if scrolled to bottom
   */
  async isScrolledToBottom(): Promise<boolean> {
    return this.chatContainer.evaluate((el) => {
      return el.scrollTop + el.clientHeight >= el.scrollHeight - 10; // 10px threshold
    });
  }

  /**
   * Wait for new message to stream in
   */
  async waitForStreamingUpdate(options?: { timeout?: number; minLength?: number }) {
    const minLength = options?.minLength ?? 1;
    await waitForCondition(
      async () => {
        const lastMessage = this.assistantMessages.last();
        const text = await lastMessage.textContent();
        return (text?.length ?? 0) >= minLength;
      },
      {
        timeout: options?.timeout ?? 5000,
        message: 'Streaming update not received',
      }
    );
  }

  /**
   * Get last message text
   */
  async getLastMessageText(): Promise<string | null> {
    return this.messages.last().textContent();
  }

  /**
   * Get last assistant message text
   */
  async getLastAssistantMessageText(): Promise<string | null> {
    return this.assistantMessages.last().textContent();
  }

  /**
   * Take screenshot
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }
}

/**
 * Auth Popup Page Object
 */
export class AuthPopupPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for auth popup to open
   */
  async waitForPopup(context: any): Promise<Page> {
    const popup = await context.waitForEvent('page');
    await popup.waitForLoadState();
    return popup;
  }

  /**
   * Complete auth in popup
   */
  async completeAuth(popup: Page) {
    // This will depend on the actual auth flow
    // For now, just close the popup to simulate completion
    await popup.close();
  }

  /**
   * Close auth popup
   */
  async closePopup(popup: Page) {
    await popup.close();
  }
}

/**
 * Multi-session Page Object
 */
export class MultiSessionPage {
  readonly page: Page;
  readonly sessionTabs: Locator;
  readonly newSessionButton: Locator;
  readonly activeSession: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sessionTabs = page.locator('[data-testid="session-tab"]');
    this.newSessionButton = page.locator('[data-testid="new-session-button"]');
    this.activeSession = page.locator('[data-testid="session-tab"][aria-selected="true"]');
  }

  /**
   * Create new session
   */
  async createNewSession() {
    await this.newSessionButton.click();
  }

  /**
   * Switch to session by index
   */
  async switchToSession(index: number) {
    await this.sessionTabs.nth(index).click();
  }

  /**
   * Get session count
   */
  async getSessionCount(): Promise<number> {
    return getCount(this.sessionTabs);
  }

  /**
   * Get active session index
   */
  async getActiveSessionIndex(): Promise<number> {
    const sessions = await this.sessionTabs.all();
    for (let i = 0; i < sessions.length; i++) {
      const isActive = await sessions[i].getAttribute('aria-selected');
      if (isActive === 'true') {
        return i;
      }
    }
    return -1;
  }
}
