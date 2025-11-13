# Fix User Authentication Issue

## Problem
The user `pawaragency9@gmail.com` (Krishna Pawar) has `status: "inactive"` which is preventing login.

## Solutions

### Option 1: Activate User via Firebase Console (Quickest)
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project "huggies"
3. Go to **Firestore Database**
4. Navigate to the `appUsers` collection
5. Find the document with `email: "pawaragency9@gmail.com"`
6. Edit the document
7. Change `status` from `"inactive"` to `"active"`
8. Save the changes
9. Try logging in again

### Option 2: Activate User via Admin Panel (Recommended)
1. Login as admin: `pranay.jumbarthi1905@gmail.com`
2. Go to **Admin Area** → **User Management**
3. Find "Krishna Pawar" in the users list
4. Click the **activate button** (UserCheck icon) next to their name
5. The status will change from "inactive" to "active"
6. User can now login

### Option 3: Re-create the User
1. Delete the current user from Firebase:
   - Delete from Firebase Console → Firestore → `appUsers`
   - Delete from Firebase Console → Authentication → Users
2. Login as admin to TapasyaFlow
3. Go to **User Management**
4. Click "Add User"
5. Fill in the form:
   - Email: `pawaragency9@gmail.com`
   - Name: `Krishna Pawar`
   - Organization: Select "Pawar Agency"
   - Role: Select role (admin/manager/user)
6. Click "Generate Password" to create a secure password
7. Click "Add User"
8. The user will be created as "active" by default
9. Share the credentials with the user

## What Was Fixed in the Code

### 1. Authentication Check
- Updated `AuthContext.tsx` to check user status on login
- If status is "inactive", login is blocked with error message
- Added email-based lookup for legacy users without UID

### 2. User Creation Process
- Updated `app/admin/users/page.tsx` to create Firebase Authentication user first
- Then creates the user in `appUsers` collection
- New users are created with `status: "active"` by default

### 3. Better Error Messages
- Added user-friendly error messages for common auth errors:
  - Invalid credentials
  - User not found
  - Wrong password
  - Inactive account

## Next Steps
1. Use **Option 1 or 2** to activate the current user (fastest)
2. Test login with: `pawaragency9@gmail.com` / `PawarAgency@905`
3. If still having issues, use **Option 3** to re-create the user
4. From now on, all new users created via Admin Panel will automatically be active

## Important Notes
- The admin email is hardcoded: `pranay.jumbarthi1905@gmail.com`
- Only admin can create and manage users
- Users can be activated/deactivated via the User Management page
- Inactive users cannot login even with correct credentials
