import type { Language } from "./types";

export const messages = {
  connected: {
    en: "Connected to server",
    ar: "متصل بالخادم",
  },
  disconnected: {
    en: "Disconnected from server",
    ar: "غير متصل بالخادم",
  },
  authRequired: {
    en: "Authentication required",
    ar: "المصادقة مطلوبة",
  },
  subscribed: {
    en: "Subscribed to channel",
    ar: "مشترك في القناة",
  },
  unsubscribed: {
    en: "Unsubscribed from channel",
    ar: "إلغاء الاشتراك من القناة",
  },
  invalidMessage: {
    en: "Invalid message format",
    ar: "تنسيق رسالة غير صالح",
  },
  unknownMessageType: {
    en: "Unknown message type",
    ar: "نوع رسالة غير معروف",
  },
  serverError: {
    en: "Server error occurred",
    ar: "حدث خطأ في الخادم",
  },
  rateLimitExceeded: {
    en: "Rate limit exceeded. Please try again later",
    ar: "تم تجاوز حد المعدل. يرجى المحاولة مرة أخرى لاحقًا",
  },
  unauthorized: {
    en: "Unauthorized access",
    ar: "وصول غير مصرح به",
  },
  forbidden: {
    en: "Forbidden",
    ar: "محظور",
  },
  notFound: {
    en: "Resource not found",
    ar: "المورد غير موجود",
  },
  userCreated: {
    en: "New user registered",
    ar: "مستخدم جديد مسجل",
  },
  userUpdated: {
    en: "User profile updated",
    ar: "تم تحديث ملف المستخدم",
  },
  userDeleted: {
    en: "User account deleted",
    ar: "تم حذف حساب المستخدم",
  },
  messageCreated: {
    en: "New message received",
    ar: "تم استلام رسالة جديدة",
  },
  messageUpdated: {
    en: "Message updated",
    ar: "تم تحديث الرسالة",
  },
  messageDeleted: {
    en: "Message deleted",
    ar: "تم حذف الرسالة",
  },
  whatsappConnected: {
    en: "WhatsApp connected",
    ar: "واتساب متصل",
  },
  whatsappDisconnected: {
    en: "WhatsApp disconnected",
    ar: "واتساب غير متصل",
  },
  whatsappQRCode: {
    en: "Scan QR code to connect WhatsApp",
    ar: "امسح رمز الاستجابة السريعة لتوصيل واتساب",
  },
  authLogin: {
    en: "User logged in",
    ar: "تم تسجيل دخول المستخدم",
  },
  authLogout: {
    en: "User logged out",
    ar: "تم تسجيل خروج المستخدم",
  },
  authRegister: {
    en: "User registered successfully",
    ar: "تم تسجيل المستخدم بنجاح",
  },
  authEmailVerified: {
    en: "Email verified successfully",
    ar: "تم التحقق من البريد الإلكتروني بنجاح",
  },
  authPasswordChanged: {
    en: "Password changed successfully",
    ar: "تم تغيير كلمة المرور بنجاح",
  },
  authProfileUpdated: {
    en: "Profile updated successfully",
    ar: "تم تحديث الملف الشخصي بنجاح",
  },
} as const;

export function getMessage(
  key: keyof typeof messages,
  language: Language = "en",
): string {
  return messages[key][language];
}

export function getErrorMessage(
  error: string,
  language: Language = "en",
): string {
  const errorKey = error as keyof typeof messages;
  if (messages[errorKey]) {
    return messages[errorKey][language];
  }
  return language === "ar" ? "حدث خطأ" : "An error occurred";
}
