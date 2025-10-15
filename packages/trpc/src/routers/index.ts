import { t } from "../trpc";
import { authRouter } from "./auth";
import { usersRouter } from "./users";
import { tenantsRouter } from "./tenants";
import { plansRouter } from "./plans";
import { subscriptionsRouter } from "./subscriptions";
import { invoicesRouter } from "./invoices";
import { paymentsRouter } from "./payments";
import { contactsRouter } from "./contacts";
import { groupsRouter } from "./groups";
import { messageTemplatesRouter } from "./message-templates";
import { campaignsRouter } from "./campaigns";
import { webhooksRouter } from "./webhooks";
import { messagesHistoryRouter } from "./messages-history";
import { notificationsRouter } from "./notifications";
import { whatsappRouter } from "./whatsapp";


export const appRouter = t.router({
  auth: authRouter,
  users: usersRouter,
  tenants: tenantsRouter,
  plans: plansRouter,
  subscriptions: subscriptionsRouter,
  invoices: invoicesRouter,
  payments: paymentsRouter,
  contacts: contactsRouter,
  groups: groupsRouter,
  messageTemplates: messageTemplatesRouter,
  campaigns: campaignsRouter,
  webhooks: webhooksRouter,
  messagesHistory: messagesHistoryRouter,
  notifications: notificationsRouter,
  whatsapp: whatsappRouter,
});

export type AppRouter = typeof appRouter;
