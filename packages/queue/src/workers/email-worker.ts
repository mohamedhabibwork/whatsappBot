import { rabbitMQ } from "../connection";
import { mailService } from "@repo/mail";
import type { EmailJob } from "../email-queue";

export async function startEmailWorker() {
  const queueName = "email_queue";

  await rabbitMQ.consume(queueName, async (message) => {
    try {
      const job: EmailJob = message;
      console.log(`Processing email job: ${job.template} to ${job.to}`);

      switch (job.template) {
        case "verifyEmail":
          await mailService.sendVerificationEmail(
            job.to,
            job.data.name,
            job.data.url!,
            job.language,
            job.data.expirationHours || 24,
          );
          break;

        case "resetPassword":
          await mailService.sendPasswordResetEmail(
            job.to,
            job.data.name,
            job.data.url!,
            job.language,
            job.data.expirationHours || 1,
          );
          break;

        case "welcomeEmail":
          await mailService.sendWelcomeEmail(
            job.to,
            job.data.name,
            job.data.url!,
            job.language,
          );
          break;

        default:
          console.error(`Unknown email template: ${job.template}`);
      }

      console.log(`✓ Email sent successfully: ${job.template} to ${job.to}`);
    } catch (error) {
      console.error("Email worker error:", error);
      throw error; // Will trigger retry
    }
  });

  console.log("✓ Email worker started");
}
