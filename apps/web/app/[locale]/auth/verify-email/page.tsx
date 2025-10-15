'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Loader2, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const verifyMutation = trpc.auth.verifyEmail.useMutation();
  const resendMutation = trpc.auth.resendVerification.useMutation();

  useEffect(() => {
    if (token) {
      handleVerify(token);
    }
  }, [token]);

  const handleVerify = async (verificationToken: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      await verifyMutation.mutateAsync({ token: verificationToken });
      setVerified(true);
      setSuccessMessage(t('verifyEmail.success'));
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || t('verifyEmail.error'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError(t('verifyEmail.emailRequired'));
      return;
    }

    setIsResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await resendMutation.mutateAsync({ email });
      setSuccessMessage(t('verifyEmail.resendSuccess'));
    } catch (err: any) {
      setError(err.message || t('verifyEmail.resendError'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            {verified ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : (
              <Mail className="h-16 w-16 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl text-center">
            {verified ? t('verifyEmail.verifiedTitle') : t('verifyEmail.title')}
          </CardTitle>
          <CardDescription className="text-center">
            {verified ? t('verifyEmail.verifiedSubtitle') : t('verifyEmail.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isVerifying && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {!verified && !isVerifying && !token && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                {t('verifyEmail.checkInbox', { email: email || 'your email' })}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                {t('verifyEmail.checkSpam')}
              </p>
            </>
          )}

          {verified && (
            <p className="text-sm text-muted-foreground text-center">
              {t('verifyEmail.redirecting')}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {!verified && !isVerifying && (
            <>
              <Button 
                onClick={handleResend} 
                disabled={isResending || !email}
                className="w-full"
                variant="outline"
              >
                {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('verifyEmail.resendButton')}
              </Button>
              <div className="text-sm text-muted-foreground text-center">
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  {t('verifyEmail.backToLogin')}
                </Link>
              </div>
            </>
          )}
          {verified && (
            <Button className="w-full" asChild>
              <Link href="/auth/login">{t('verifyEmail.continueToLogin')}</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
