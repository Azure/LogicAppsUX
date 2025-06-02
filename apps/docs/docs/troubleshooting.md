---
sidebar_position: 11
---

# Troubleshooting Guide

This guide helps you resolve common issues when using Logic Apps designer. Find your issue below and follow the step-by-step solutions.

## 🔍 Quick Solutions

### Common Issues

| Issue | Solution |
|-------|----------|
| **Designer won't load** | Clear browser cache and cookies |
| **Can't save workflow** | Check internet connection and try again |
| **Actions missing** | Refresh the page or sign out and back in |
| **Slow performance** | Close other browser tabs and check connection |
| **Authentication errors** | Sign out completely and sign back in |

## 📱 Browser Issues

### Designer Not Loading

<details>
<summary><strong>The Logic Apps designer shows a blank screen or won't load</strong></summary>

**Try these solutions in order:**

1. **Refresh the page**
   - Windows/Linux: `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **Clear browser cache**
   - Chrome: Settings → Privacy → Clear browsing data
   - Edge: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear Data
   - Safari: Develop → Empty Caches

3. **Try incognito/private mode**
   - This bypasses extensions and cache issues
   - Chrome: `Ctrl/Cmd + Shift + N`
   - Edge: `Ctrl/Cmd + Shift + N`
   - Firefox: `Ctrl/Cmd + Shift + P`
   - Safari: `Cmd + Shift + N`

4. **Disable browser extensions**
   - Ad blockers and security extensions can interfere
   - Try disabling all extensions temporarily

5. **Use a supported browser**
   - Chrome (recommended)
   - Microsoft Edge
   - Firefox
   - Safari (latest version)

**Still not working?** Try a different browser or device.
</details>

### Performance Issues

<details>
<summary><strong>The designer is running slowly or freezing</strong></summary>

**Improve performance:**

1. **Close unnecessary browser tabs**
   - Each tab uses memory
   - Keep only essential tabs open

2. **Check your internet connection**
   - Run a speed test: [fast.com](https://fast.com)
   - Need at least 10 Mbps for smooth operation

3. **Reduce workflow complexity**
   - Very large workflows (100+ actions) may load slowly
   - Consider breaking into smaller workflows

4. **Update your browser**
   - Outdated browsers can cause performance issues
   - Check for updates in browser settings

5. **Restart your browser**
   - Completely close and reopen
   - This clears temporary memory issues

6. **Check system resources**
   - Close other applications
   - Restart your computer if needed
</details>

## 🔐 Authentication & Access

### Sign-in Problems

<details>
<summary><strong>Can't sign in or getting authentication errors</strong></summary>

**Solutions:**

1. **Clear all cookies for the site**
   - This forces a fresh login
   - Browser settings → Privacy → Cookies → Remove site cookies

2. **Sign out completely**
   - Click your profile picture
   - Select "Sign out"
   - Close the browser
   - Open browser and sign in again

3. **Check account permissions**
   - Ensure you have access to the Logic App
   - Contact your administrator if unsure

4. **Try a different account**
   - Test if the issue is account-specific
   - Use a test or alternate account

5. **Reset your password**
   - Sometimes fixes authentication cache issues
   - Follow your organization's password reset process
</details>

### Connection Errors

<details>
<summary><strong>Can't connect to services or APIs</strong></summary>

**Troubleshooting steps:**

1. **Check connection status**
   - Go to Connections in the left menu
   - Look for error icons
   - Click "Fix connection" if available

2. **Re-authenticate connections**
   - Click the connection
   - Select "Edit"
   - Sign in again with correct credentials

3. **Create a new connection**
   - Sometimes easier than fixing
   - Delete the old connection after

4. **Verify API credentials**
   - Check if API keys have expired
   - Ensure credentials have required permissions
   - Test credentials outside Logic Apps first

5. **Network restrictions**
   - Check if your network blocks certain services
   - Try from a different network
   - Contact IT if on corporate network
</details>

## 💾 Saving & Publishing

### Can't Save Changes

<details>
<summary><strong>Getting errors when trying to save the workflow</strong></summary>

**Common solutions:**

1. **Check internet connection**
   - Ensure stable connection
   - Try saving again after connection restored

2. **Copy your work**
   - Select all actions (Ctrl/Cmd + A)
   - Copy (Ctrl/Cmd + C)
   - Refresh page and paste if needed

3. **Check for validation errors**
   - Look for red error indicators
   - Fix all required fields
   - Ensure all connections are valid

4. **Session timeout**
   - You may have been inactive too long
   - Sign out and back in
   - Try saving again

5. **Browser storage full**
   - Clear browser cache and cookies
   - Free up disk space if needed

**Tip**: Enable auto-save in settings to prevent losing work.
</details>

### Workflow Not Running

<details>
<summary><strong>Saved workflow but it's not triggering or running</strong></summary>

**Check these items:**

1. **Workflow is enabled**
   - Check the Enable/Disable toggle
   - Must be "Enabled" to run

2. **Trigger configuration**
   - Verify trigger settings are correct
   - Check schedule if using recurrence
   - Test manual trigger first

3. **Run history**
   - Check if runs are failing
   - Look at error messages
   - Common: authentication expired

4. **Consumption limits**
   - Check if you've hit usage limits
   - Review your plan's quotas
   - May need to upgrade plan

5. **Regional issues**
   - Check Azure status page
   - Try deploying to different region
</details>

## 🛠️ Designer Features

### Missing Actions or Connectors

<details>
<summary><strong>Can't find specific actions or connectors</strong></summary>

**Solutions:**

1. **Use search effectively**
   - Type connector name in search
   - Try alternative names (e.g., "Email" for "Outlook")
   - Clear search and browse categories

2. **Check connector availability**
   - Some connectors are premium
   - Verify your plan includes the connector
   - Standard vs Consumption differences

3. **Refresh the designer**
   - New connectors may not appear immediately
   - Hard refresh: Ctrl/Cmd + Shift + R

4. **Region restrictions**
   - Some connectors are region-specific
   - Check connector documentation
   - May need to deploy to different region

5. **Custom connectors**
   - Ensure properly deployed
   - Check API definition is valid
   - Test in API management first
</details>

### Parameters Not Working

<details>
<summary><strong>Workflow parameters not showing or updating</strong></summary>

**Fix parameter issues:**

1. **Refresh parameter list**
   - Click refresh icon in parameters panel
   - Close and reopen parameters

2. **Check parameter syntax**
   - No spaces in parameter names
   - Use camelCase or underscore_case
   - Avoid special characters

3. **Save workflow first**
   - Parameters need workflow to be saved
   - Save, then refresh page

4. **Check parameter usage**
   - Ensure using correct syntax: `@parameters('name')`
   - Case-sensitive names
   - No typos in references

5. **Clear and recreate**
   - Delete the parameter
   - Save workflow
   - Create parameter again
</details>

## 🔧 VS Code Extension

### Extension Not Working

<details>
<summary><strong>Logic Apps VS Code extension issues</strong></summary>

**Troubleshooting steps:**

1. **Update the extension**
   - Check Extensions panel for updates
   - Update VS Code itself too

2. **Reload VS Code**
   - Ctrl/Cmd + Shift + P
   - Type "Reload Window"
   - Press Enter

3. **Check extension requirements**
   - Need Azure Account extension
   - Need Azure Functions extension
   - Sign in to Azure

4. **Clear extension cache**
   - Uninstall extension
   - Restart VS Code
   - Reinstall extension

5. **Check output logs**
   - View → Output
   - Select "Azure Logic Apps" from dropdown
   - Look for error messages
</details>

## 🆘 Getting More Help

If these solutions don't work:

### 1. Check Service Status
- Visit [Azure Status](https://status.azure.com)
- Look for Logic Apps service issues
- Check your specific region

### 2. Gather Information
Before contacting support, collect:
- Screenshot of the error
- Workflow name and resource group
- Time the issue occurred
- Browser and version
- Steps you've already tried

### 3. Contact Support
- **Azure Portal**: Help + Support section
- **GitHub**: [Report issues](https://github.com/Azure/LogicAppsUX/issues)
- **Community**: [Microsoft Q&A](https://docs.microsoft.com/answers/topics/azure-logic-apps.html)

### 4. Provide Feedback
Help us improve:
- Use the feedback button in the designer
- Include specific details about your issue
- Suggest improvements

---

💡 **Pro Tip**: Bookmark this page for quick access when you need help!