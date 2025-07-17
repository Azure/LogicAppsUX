import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from '../utils/GoToWorkflow';

test(
  'password mask',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await page.goto('/');

    await GoToMockWorkflow(page, 'Panel');

    await page.getByTestId('card-http').click();
    await page.getByPlaceholder('Showing 0 of').click();
    await page.getByRole('menuitemcheckbox', { name: 'Authentication' }).click();
    await page.getByPlaceholder('Showing 0 of').click();

    await page.getByText('None').click();
    await page.getByRole('option', { name: 'Basic' }).click();

    await page.getByTestId('msla-authentication-editor-basic-username').click();
    await page.keyboard.type('user');

    await page.getByTestId('msla-authentication-editor-basic-password').click();
    await page.keyboard.type('password');

    await page.getByRole('tab', { name: 'Code view' }).click();
    await expect(page.getByRole('code')).toContainText(
      '{ "type": "Http", "inputs": { "uri": "http://test.com", "method": "GET", "body": "@variables(\'ArrayVariable\')", "authentication": { "type": "Basic", "username": "user", "password": "password" } }, "runAfter": { "Filter_array": [ "SUCCEEDED" ] }, "runtimeConfiguration": { "contentTransfer": { "transferMode": "Chunked" } }}'
    );

    await page.getByRole('tab', { name: 'Parameters' }).click();

    await page.getByTestId('msla-authentication-editor-basic-username').click();
    await page.getByTestId('msla-authentication-editor-basic-username').press('ControlOrMeta+a');
    await page.getByTestId('msla-authentication-editor-basic-username').press('ControlOrMeta+c');

    // Verify Show password butotn works
    await page.getByTestId('msla-authentication-editor-basic-password').click();
    await page.keyboard.type('test');
    await page.getByLabel('Show Password').click();

    await page.getByTestId('msla-authentication-editor-basic-password').click();
    await page.keyboard.type('2');

    await page.getByRole('tab', { name: 'Code view' }).click();
    await expect(page.getByRole('code')).toContainText(
      '{ "type": "Http", "inputs": { "uri": "http://test.com", "method": "GET", "body": "@variables(\'ArrayVariable\')", "authentication": { "type": "Basic", "username": "user", "password": "passwordtest2" } }, "runAfter": { "Filter_array": [ "SUCCEEDED" ] }, "runtimeConfiguration": { "contentTransfer": { "transferMode": "Chunked" } }}'
    );

    await page.getByRole('tab', { name: 'Parameters' }).click();
    await page.getByTestId('msla-authentication-editor-basic-password').click();

    await page.getByTestId('msla-authentication-editor-basic-password').press('ArrowLeft');
    await page.getByTestId('msla-authentication-editor-basic-password').press('ArrowLeft');
    await page.getByTestId('msla-authentication-editor-basic-password').press('Shift+ArrowLeft');
    await page.getByTestId('msla-authentication-editor-basic-password').press('Shift+ArrowLeft');
    await page.getByTestId('msla-authentication-editor-basic-password').press('Shift+ArrowLeft');
    await page.getByTestId('msla-authentication-editor-basic-password').press('Shift+ArrowLeft');
    await page.getByTestId('msla-authentication-editor-basic-username').press('ControlOrMeta+v');
    await page.keyboard.type('text');

    await page.getByRole('tab', { name: 'Code view' }).click();
    await expect(page.getByRole('code')).toContainText(
      '{ "type": "Http", "inputs": { "uri": "http://test.com", "method": "GET", "body": "@variables(\'ArrayVariable\')", "authentication": { "type": "Basic", "username": "user", "password": "passworusertextt2" } }, "runAfter": { "Filter_array": [ "SUCCEEDED" ] }, "runtimeConfiguration": { "contentTransfer": { "transferMode": "Chunked" } }}'
    );
  }
);
