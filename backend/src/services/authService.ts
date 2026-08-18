import { db } from '../config/db.js';
import { createOtp, verifyOtp } from '../auth/otp.js';
import { createTokenPair, verifyRefreshToken } from '../auth/jwt.js';
import { normalizeEmail } from '../utils/helpers.js';
import type { CompleteProfileInput } from '../validators/auth.js';
import { firebaseAuth } from '../config/firebase.js';
import bcrypt from 'bcryptjs';

export async function registerUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  // Check if user exists in Firestore
  const usersSnap = await db.collection('users')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  if (!usersSnap.empty) {
    throw Object.assign(new Error('User already exists'), { statusCode: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const userRef = db.collection('users').doc();
  const userId = userRef.id;
  const userData = {
    id: userId,
    email: normalizedEmail,
    passwordHash,
    role: 'participant',
    isActive: true,
    profileCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await userRef.set(userData);

  const tokens = createTokenPair({ userId, email: normalizedEmail, role: 'participant' });

  return {
    user: {
      id: userId,
      email: normalizedEmail,
      role: 'participant',
      profileCompleted: false,
    },
    profile: null,
    tokens,
  };
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  console.log(`[DEBUG] Attempting login for email: "${email}", normalized: "${normalizedEmail}"`);

  // Check if user exists in Firestore
  const usersSnap = await db.collection('users')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  console.log(`[DEBUG] Found users count: ${usersSnap.size}`);

  if (usersSnap.empty) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const userDoc = usersSnap.docs[0];
  const userData = userDoc.data();

  if (!userData.isActive) {
    throw Object.assign(new Error('Account has been deactivated'), { statusCode: 403 });
  }

  // If passwordHash does not exist (e.g. Google-only users), they must login with Google
  if (!userData.passwordHash) {
    throw Object.assign(new Error('Please login using Google'), { statusCode: 400 });
  }

  const isMatch = await bcrypt.compare(password, userData.passwordHash);
  if (!isMatch) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  // Update last login
  await userDoc.ref.update({
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  });

  const tokens = createTokenPair({ userId: userData.id, email: userData.email, role: userData.role });

  const profilesSnap = await db.collection('profiles')
    .where('userId', '==', userData.id)
    .limit(1)
    .get();

  const profile = profilesSnap.empty ? null : profilesSnap.docs[0].data();

  return {
    user: {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      profileCompleted: userData.profileCompleted,
    },
    profile,
    tokens,
  };
}


export async function sendOtp(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);

  // Check if user exists in Firestore
  const usersSnap = await db.collection('users')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  let userId: string;

  if (usersSnap.empty) {
    // Register new participant
    const userRef = db.collection('users').doc();
    userId = userRef.id;
    await userRef.set({
      id: userId,
      email: normalizedEmail,
      role: 'participant',
      isActive: true,
      profileCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await createOtp(normalizedEmail);
}

export async function verifyOtpAndLogin(email: string, otp: string) {
  const normalizedEmail = normalizeEmail(email);
  await verifyOtp(normalizedEmail, otp);

  const usersSnap = await db.collection('users')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    throw new Error('User not found after OTP verification');
  }

  const userDoc = usersSnap.docs[0];
  const userData = userDoc.data();

  if (!userData.isActive) {
    throw new Error('Account has been deactivated');
  }

  // Update last login
  await userDoc.ref.update({
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  });

  const tokens = createTokenPair({ userId: userData.id, email: userData.email, role: userData.role });

  const profilesSnap = await db.collection('profiles')
    .where('userId', '==', userData.id)
    .limit(1)
    .get();

  const profile = profilesSnap.empty ? null : profilesSnap.docs[0].data();

  return {
    user: {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      profileCompleted: userData.profileCompleted,
    },
    profile,
    tokens,
  };
}

export async function verifyFirebaseTokenAndLogin(idToken: string) {
  let decodedToken;
  try {
    decodedToken = await firebaseAuth.verifyIdToken(idToken);
  } catch (error) {
    throw Object.assign(new Error('Invalid or expired Firebase ID token'), { statusCode: 401 });
  }

  const email = decodedToken.email;
  if (!email) {
    throw Object.assign(new Error('Email not found in Firebase token'), { statusCode: 400 });
  }

  const normalizedEmail = normalizeEmail(email);

  // Check if user exists in Firestore
  const usersSnap = await db.collection('users')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  let userData: any;
  let userRef: any;

  if (usersSnap.empty) {
    // Register new participant
    userRef = db.collection('users').doc();
    const userId = userRef.id;
    userData = {
      id: userId,
      email: normalizedEmail,
      role: 'participant',
      isActive: true,
      profileCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await userRef.set(userData);
  } else {
    userDoc = usersSnap.docs[0];
    userRef = userDoc.ref;
    userData = userDoc.data();
  }

  var userDoc;

  if (!userData.isActive) {
    throw Object.assign(new Error('Account has been deactivated'), { statusCode: 403 });
  }

  // Update last login
  await userRef.update({
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  });

  const tokens = createTokenPair({ userId: userData.id, email: userData.email, role: userData.role });

  const profilesSnap = await db.collection('profiles')
    .where('userId', '==', userData.id)
    .limit(1)
    .get();

  const profile = profilesSnap.empty ? null : profilesSnap.docs[0].data();

  return {
    user: {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      profileCompleted: userData.profileCompleted,
    },
    profile,
    tokens,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const decoded = verifyRefreshToken(refreshToken);

  const userDoc = await db.collection('users').doc(decoded.userId).get();
  if (!userDoc.exists) {
    throw new Error('User not found or inactive');
  }

  const userData = userDoc.data()!;
  if (!userData.isActive) {
    throw new Error('User not found or inactive');
  }

  const tokens = createTokenPair({ userId: userData.id, email: userData.email, role: userData.role });
  return { tokens, user: { id: userData.id, email: userData.email, role: userData.role } };
}

export async function completeProfile(userId: string, data: CompleteProfileInput) {
  // Check USN uniqueness in profiles
  const profilesSnap = await db.collection('profiles')
    .where('usn', '==', data.usn.toUpperCase())
    .limit(1)
    .get();

  if (!profilesSnap.empty) {
    const existingProfile = profilesSnap.docs[0].data();
    if (existingProfile.userId !== userId) {
      throw Object.assign(new Error('USN already registered by another participant'), { statusCode: 409 });
    }
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const profileData = {
    userId,
    name: data.name,
    usn: data.usn.toUpperCase(),
    department: data.department,
    semester: data.semester,
    phone: data.phone,
    avatarUrl: null,
    totalPoints: '0.00',
    updatedAt: new Date(),
  };

  const existingProfileSnap = await db.collection('profiles')
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (!existingProfileSnap.empty) {
    await existingProfileSnap.docs[0].ref.update({
      name: data.name,
      usn: data.usn.toUpperCase(),
      department: data.department,
      semester: data.semester,
      phone: data.phone,
      updatedAt: new Date(),
    });
  } else {
    const profileRef = db.collection('profiles').doc();
    await profileRef.set({
      id: profileRef.id,
      ...profileData,
      createdAt: new Date(),
    });
  }

  await userDoc.ref.update({
    profileCompleted: true,
    updatedAt: new Date(),
  });

  const finalProfileSnap = await db.collection('profiles')
    .where('userId', '==', userId)
    .limit(1)
    .get();

  return finalProfileSnap.docs[0].data();
}

export async function getMe(userId: string) {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const profilesSnap = await db.collection('profiles')
    .where('userId', '==', userId)
    .limit(1)
    .get();

  let profile = profilesSnap.empty ? null : profilesSnap.docs[0].data();

  if (profile) {
    // Recalculate true total points from deduplicated round_results
    const userResultsSnap = await db.collection('round_results')
      .where('userId', '==', userId)
      .get();
    
    const roundScores = new Map<string, number>();
    userResultsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      roundScores.set(data.roundId, parseFloat(data.totalScore || '0'));
    });

    let overallPoints = 0;
    roundScores.forEach(score => { overallPoints += score; });
    const formattedPoints = String(overallPoints);

    if (profile.totalPoints !== formattedPoints && !profilesSnap.empty) {
      await profilesSnap.docs[0].ref.update({ totalPoints: formattedPoints, updatedAt: new Date() });
      profile.totalPoints = formattedPoints;
    }

    const allProfilesSnap = await db.collection('profiles').get();
    const profiles = allProfilesSnap.docs.map(d => d.data());
    profiles.sort((a, b) => parseFloat(b.totalPoints || '0') - parseFloat(a.totalPoints || '0'));
    const index = profiles.findIndex(p => p.userId === userId);
    const rank = index !== -1 ? index + 1 : null;
    profile = { ...profile, rank };
  }

  return { user: userDoc.data()!, profile };
}
