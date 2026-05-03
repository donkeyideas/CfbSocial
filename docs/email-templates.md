# CFB Social - Supabase Email Templates

Go to **Supabase Dashboard > Authentication > Email** (under NOTIFICATIONS in the sidebar).
Click each template type, paste the HTML below, and save.

**Subject lines** are listed before each template — update those too.

---

## 1. Confirm Sign Up

**Subject:** `Confirm your CFB Social account`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe4;padding:40px 0;font-family:Georgia,'Times New Roman',serif;">
  <tr>
    <td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d4c9b8;border-radius:4px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#8b1a1a;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#f4efe4;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;letter-spacing:1px;">CFB Social</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;color:#3b2f1e;">
            <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#3b2f1e;">Confirm Your Account</h2>
            <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#5a4d3a;">
              Welcome to CFB Social. Click the button below to confirm your email address and activate your account.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td align="center" style="background:#8b1a1a;border-radius:4px;">
                  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 36px;color:#f4efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;">Confirm Email Address</a>
                </td>
              </tr>
            </table>
            <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.5;color:#9a8c7a;">
              If you did not create an account on CFB Social, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #d4c9b8;text-align:center;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9a8c7a;">
              CFB Social &mdash; The College Football Fan Community
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 2. Invite User

**Subject:** `You've been invited to CFB Social`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe4;padding:40px 0;font-family:Georgia,'Times New Roman',serif;">
  <tr>
    <td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d4c9b8;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#8b1a1a;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#f4efe4;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;letter-spacing:1px;">CFB Social</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#3b2f1e;">
            <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#3b2f1e;">You Are Invited</h2>
            <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#5a4d3a;">
              You have been invited to join CFB Social, the college football fan community. Click below to accept your invitation and create your account.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td align="center" style="background:#8b1a1a;border-radius:4px;">
                  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 36px;color:#f4efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;">Accept Invitation</a>
                </td>
              </tr>
            </table>
            <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.5;color:#9a8c7a;">
              If you were not expecting this invitation, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #d4c9b8;text-align:center;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9a8c7a;">
              CFB Social &mdash; The College Football Fan Community
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 3. Magic Link

**Subject:** `Your CFB Social sign-in link`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe4;padding:40px 0;font-family:Georgia,'Times New Roman',serif;">
  <tr>
    <td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d4c9b8;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#8b1a1a;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#f4efe4;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;letter-spacing:1px;">CFB Social</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#3b2f1e;">
            <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#3b2f1e;">Sign In Link</h2>
            <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#5a4d3a;">
              Click the button below to sign in to your CFB Social account. This link is valid for a single use.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td align="center" style="background:#8b1a1a;border-radius:4px;">
                  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 36px;color:#f4efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;">Sign In to CFB Social</a>
                </td>
              </tr>
            </table>
            <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.5;color:#9a8c7a;">
              If you did not request this link, you can safely ignore this email. Your account is secure.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #d4c9b8;text-align:center;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9a8c7a;">
              CFB Social &mdash; The College Football Fan Community
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 4. Change Email Address

**Subject:** `Confirm your new email address on CFB Social`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe4;padding:40px 0;font-family:Georgia,'Times New Roman',serif;">
  <tr>
    <td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d4c9b8;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#8b1a1a;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#f4efe4;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;letter-spacing:1px;">CFB Social</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#3b2f1e;">
            <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#3b2f1e;">Confirm New Email</h2>
            <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#5a4d3a;">
              You requested to change the email address on your CFB Social account. Click below to confirm this change.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td align="center" style="background:#8b1a1a;border-radius:4px;">
                  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 36px;color:#f4efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;">Confirm New Email</a>
                </td>
              </tr>
            </table>
            <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.5;color:#9a8c7a;">
              If you did not request this change, please secure your account by resetting your password immediately.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #d4c9b8;text-align:center;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9a8c7a;">
              CFB Social &mdash; The College Football Fan Community
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 5. Reset Password

**Subject:** `Reset your CFB Social password`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe4;padding:40px 0;font-family:Georgia,'Times New Roman',serif;">
  <tr>
    <td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d4c9b8;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#8b1a1a;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#f4efe4;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;letter-spacing:1px;">CFB Social</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#3b2f1e;">
            <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#3b2f1e;">Reset Your Password</h2>
            <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#5a4d3a;">
              We received a request to reset the password for your CFB Social account. Click the button below to choose a new password.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td align="center" style="background:#8b1a1a;border-radius:4px;">
                  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 36px;color:#f4efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;">Reset Password</a>
                </td>
              </tr>
            </table>
            <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.5;color:#9a8c7a;">
              If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #d4c9b8;text-align:center;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9a8c7a;">
              CFB Social &mdash; The College Football Fan Community
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 6. Reauthentication

**Subject:** `CFB Social security verification`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe4;padding:40px 0;font-family:Georgia,'Times New Roman',serif;">
  <tr>
    <td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d4c9b8;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#8b1a1a;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#f4efe4;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;letter-spacing:1px;">CFB Social</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#3b2f1e;">
            <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#3b2f1e;">Security Verification</h2>
            <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#5a4d3a;">
              A sensitive action was requested on your CFB Social account. Click the button below to verify your identity and proceed.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td align="center" style="background:#8b1a1a;border-radius:4px;">
                  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 36px;color:#f4efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;">Verify Identity</a>
                </td>
              </tr>
            </table>
            <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.5;color:#9a8c7a;">
              If you did not initiate this request, please secure your account by changing your password immediately.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #d4c9b8;text-align:center;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9a8c7a;">
              CFB Social &mdash; The College Football Fan Community
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```
