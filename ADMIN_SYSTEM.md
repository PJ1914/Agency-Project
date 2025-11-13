# 🛡️ Admin System Documentation

## Overview
This application now has a comprehensive admin system where only **pranay.jumbarthi1905@gmail.com** has full administrative access.

---

## 🔐 Admin Privileges

### Admin Email
```
pranay.jumbarthi1905@gmail.com
```

### Admin-Only Features
1. **Organization Management** (`/organizations`)
   - Create new organizations
   - View all organizations
   - Edit organization details
   - Delete organizations

2. **User Management** (`/admin/users`)
   - Create user accounts
   - Generate secure passwords
   - Assign users to organizations
   - Set user roles (Admin, Manager, User)
   - Activate/Deactivate users
   - Delete users
   - View user credentials

---

## 👥 User Management System

### Creating New Users

1. Navigate to **User Management** (visible only to admin in sidebar)
2. Click **"Create User"** button
3. Fill in user details:
   - Full Name
   - Email Address
   - Select Organization
   - Choose Role (Admin, Manager, User)
4. Click **"Generate Password"** (lock icon) to create a secure password
5. Click **"Create User"**
6. **IMPORTANT**: Copy the credentials shown in the alert and share with the user

### Generated User Credentials
When you create a user, you'll see an alert like this:

```
User created successfully!

Email: john@example.com
Password: xK9#mP2$qR5@

Please save these credentials and share with the user.
```

**Important Notes:**
- Passwords are 12 characters long
- Include uppercase, lowercase, numbers, and special characters
- Passwords are stored temporarily for admin distribution
- Users should change their password after first login

---

## 📊 User Information Display

### Account Page Features

When users log in, the **Account** page (`/dashboard/account`) displays:

1. **Profile Information**
   - Full Name
   - Email Address
   - User ID

2. **Organization Access**
   - Current Organization
   - User Role
   - Status (Active/Inactive)

3. **Current Session** ⭐ NEW!
   - Last Login Time
   - Browser (Chrome, Firefox, Safari, Edge)
   - Operating System (Windows, macOS, Linux)
   - Location (Coordinates if permission granted)

4. **Security Settings**
   - Password management
   - Two-factor authentication (coming soon)

---

## 🔒 Access Control

### Admin-Only Pages

These pages are **restricted to admin only**:

1. **Organizations** (`/organizations`)
   - Shows "Access Denied" for non-admin users
   - Redirects to dashboard

2. **User Management** (`/admin/users`)
   - Shows "Access Denied" for non-admin users
   - Lists all users across all organizations
   - Shows credentials for password sharing

### Sidebar Navigation

**Admin sees:**
- Dashboard
- Orders
- Inventory
- Shipments
- Payments
- Reports
- Settings
- **--- ADMIN AREA ---**
- **Organizations** 🛡️
- **User Management** 🛡️
- Account

**Regular users see:**
- Dashboard
- Orders
- Inventory
- Shipments
- Payments
- Reports
- Settings
- Account

---

## 🎯 User Workflow

### Admin Workflow

1. **Login** as pranay.jumbarthi1905@gmail.com
2. **Create Organization** (if needed)
   - Go to Organizations
   - Click "Add New Organization"
   - Fill details and save

3. **Create User Account**
   - Go to User Management
   - Click "Create User"
   - Fill user details
   - Generate password
   - Assign to organization
   - Copy credentials

4. **Share Credentials**
   - Email or securely send:
     - Email address
     - Temporary password
     - Login URL: `http://localhost:3000/login`

### User Workflow

1. **Receive Credentials**
   - Email: user@example.com
   - Password: xK9#mP2$qR5@

2. **First Login**
   - Go to login page
   - Enter email and password
   - Access dashboard

3. **View Account Info**
   - Go to Account page
   - See session information:
     - Login time
     - Browser used
     - Operating system
     - Location
   - See organization assignment
   - See role and permissions

---

## 📋 Database Collections

### `organizations`
Stores all organization data
```javascript
{
  name: "Acme Corp",
  slug: "acme-corp",
  email: "contact@acme.com",
  planType: "premium",
  status: "active",
  createdAt: timestamp,
  createdBy: "admin"
}
```

### `appUsers`
Stores user accounts created by admin
```javascript
{
  email: "user@example.com",
  password: "xK9#mP2$qR5@", // Temporary password
  name: "John Doe",
  organizationId: "org123",
  role: "user", // admin, manager, user
  status: "active", // active, inactive
  createdAt: timestamp,
  createdBy: "pranay.jumbarthi1905@gmail.com"
}
```

---

## 🔐 Security Features

1. **Admin Email Check**
   - Hardcoded admin email
   - Routes protected at component level
   - Immediate redirect for unauthorized access

2. **Session Tracking**
   - Browser detection
   - OS detection
   - Location tracking (with user permission)
   - Last login timestamp

3. **Password Generation**
   - 12-character passwords
   - Mix of uppercase, lowercase, numbers, symbols
   - Cryptographically secure random generation

4. **User Status Management**
   - Active/Inactive toggle
   - Prevents login for inactive users
   - Soft delete (keep records)

---

## 🚀 Next Steps

### Recommended Enhancements

1. **Email Integration**
   - Auto-send credentials to new users
   - Welcome email with login instructions
   - Password reset functionality

2. **Login History**
   - Store all login attempts in Firestore
   - Display last 10 logins
   - Show IP addresses and locations

3. **Password Change**
   - Force password change on first login
   - Password strength requirements
   - Password history

4. **Two-Factor Authentication**
   - SMS or email OTP
   - Authenticator app support
   - Backup codes

5. **Audit Logs**
   - Track all admin actions
   - User activity monitoring
   - Export audit reports

---

## 📞 Support

For admin support or issues:
- Email: pranay.jumbarthi1905@gmail.com
- Access: Full system administration

For user support:
- Contact your organization admin
- Or reach out to pranay.jumbarthi1905@gmail.com

---

## ⚠️ Important Notes

1. **Credentials Storage**
   - Passwords are currently stored in plain text in Firestore
   - For production, implement proper password hashing (bcrypt, argon2)
   - Consider using Firebase Authentication instead

2. **Access Control**
   - Admin check is client-side only
   - Add Firestore security rules for server-side protection
   - Implement role-based access control (RBAC)

3. **User Onboarding**
   - Always generate strong passwords
   - Share credentials securely (not via plain email)
   - Encourage users to change passwords

4. **Organization Assignment**
   - Users belong to one organization
   - All their data is filtered by organizationId
   - Users can only see their organization's data

---

**Last Updated**: November 13, 2025
**Version**: 1.0.0
**Admin**: pranay.jumbarthi1905@gmail.com
