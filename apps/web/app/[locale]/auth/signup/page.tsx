'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2, AlertCircle, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/auth';

export default function SignupPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isAuthenticated } = useAuth();
  const selectedPlanId = searchParams.get('plan');
  const invitationCode = searchParams.get('invitation');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    tenantName: '',
    planId: selectedPlanId || '',
    invitationCode: invitationCode || '',
  });

  // Fetch all plans for selection
  const { data: allPlansData } = trpc.plans.list.useQuery({
    includeInactive: false,
    includePrivate: false,
  });

  // Fetch selected plan details if planId is in URL or form
  const { data: planData } = trpc.plans.getById.useQuery(
    { id: formData.planId || selectedPlanId! },
    { enabled: !!(formData.planId || selectedPlanId) }
  );

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.planId && !invitationCode) {
      setError(t('signup.errors.selectPlan'));
      return;
    }

    if (!invitationCode && !formData.tenantName.trim()) {
      setError(t('signup.errors.tenantName'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('signup.errors.passwordMismatch'));
      return;
    }

    if (formData.password.length < 8) {
      setError(t('signup.errors.passwordLength'));
      return;
    }

    if (!formData.name.trim()) {
      setError(t('signup.errors.name'));
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        language: 'en',
        invitationToken: invitationCode || undefined,
      });
      // Auth context will handle redirect to verify-email
    } catch (err: any) {
      setError(err.message || t('signup.errors.general'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8">
        {/* Signup Form */}
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <MessageSquare className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">{t('signup.title')}</CardTitle>
            <CardDescription className="text-center">
              {t('signup.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">{t('signup.name')}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('signup.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('signup.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('signup.emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
              </div>

              {!invitationCode && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="planId">
                      {t('signup.selectPlan')} <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="planId"
                      value={formData.planId}
                      onChange={(e) =>
                        setFormData({ ...formData, planId: e.target.value })
                      }
                      required
                      disabled={isLoading}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">{t('signup.choosePlan')}</option>
                      {allPlansData?.plans.map((plan: any) => (
                        <option key={plan.id} value={plan.id}>
                          {typeof plan.name === 'object' && plan.name !== null
                            ? (plan.name as any).en || (plan.name as any).ar
                            : plan.name}{' '}
                          - ${plan.price}
                          {parseFloat(plan.price) > 0 ? '/month' : ' (Free)'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {t('signup.planHint')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenantName">
                      {t('signup.tenantName')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="tenantName"
                      type="text"
                      placeholder={t('signup.tenantNamePlaceholder')}
                      value={formData.tenantName}
                      onChange={(e) =>
                        setFormData({ ...formData, tenantName: e.target.value })
                      }
                      required
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('signup.tenantHint')}
                    </p>
                  </div>
                </>
              )}

              {invitationCode && (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    {t('signup.invitationMessage')}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">{t('signup.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('signup.passwordPlaceholder')}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('signup.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('signup.submit')}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <div className="text-sm text-muted-foreground text-center w-full">
              {t('signup.hasAccount')}{' '}
              <Link
                href="/auth/login"
                className="underline underline-offset-4 hover:text-primary font-semibold"
              >
                {t('signup.loginLink')}
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Plan Details */}
        {planData && (
          <Card className="border-primary/50">
            <CardHeader>
              <Badge className="w-fit mb-2">Selected Plan</Badge>
              <CardTitle className="text-2xl">
                {typeof planData.plan.name === 'object' && planData.plan.name !== null
                  ? (planData.plan.name as any).en || (planData.plan.name as any).ar
                  : planData.plan.name}
              </CardTitle>
              <CardDescription>
                {typeof planData.plan.description === 'object' && planData.plan.description !== null
                  ? (planData.plan.description as any).en || (planData.plan.description as any).ar
                  : planData.plan.description}
              </CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">
                  {parseFloat(planData.plan.price) === 0 ? '$0' : `$${planData.plan.price}`}
                </span>
                {parseFloat(planData.plan.price) > 0 && (
                  <span className="text-muted-foreground ml-2">
                    /{planData.plan.billingCycle}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h4 className="font-semibold mb-3">What's included:</h4>
                {planData.features && planData.features.length > 0 ? (
                  planData.features.map((feature: any) => (
                    <div key={feature.id} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">
                        {typeof feature.name === 'object' && feature.name !== null
                          ? (feature.name as any).en || (feature.name as any).ar
                          : feature.name}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    {planData.plan.maxMessagesPerMonth && (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">
                          {planData.plan.maxMessagesPerMonth === 999999
                            ? 'Unlimited messages'
                            : `${planData.plan.maxMessagesPerMonth.toLocaleString()} messages/month`}
                        </span>
                      </div>
                    )}
                    {planData.plan.maxWhatsappInstances && (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">
                          {planData.plan.maxWhatsappInstances === 999999
                            ? 'Unlimited WhatsApp instances'
                            : `${planData.plan.maxWhatsappInstances} WhatsApp instance${planData.plan.maxWhatsappInstances > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    )}
                    {planData.plan.maxUsers && (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">
                          {planData.plan.maxUsers === 999999
                            ? 'Unlimited users'
                            : `Up to ${planData.plan.maxUsers} user${planData.plan.maxUsers > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    )}
                    {planData.plan.trialDays && planData.plan.trialDays > 0 && (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">
                          {planData.plan.trialDays} days free trial
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                {parseFloat(planData.plan.price) === 0
                  ? 'This plan is completely free. No credit card required.'
                  : `You can cancel anytime. Your subscription will start after ${planData.plan.trialDays || 0} days trial.`}
              </p>
            </CardFooter>
          </Card>
        )}

        {/* Default message when no plan selected */}
        {!planData && !selectedPlanId && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Plan</CardTitle>
              <CardDescription>
                You haven't selected a plan yet. Don't worry, you can choose one after creating your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Start with a free plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Upgrade anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Cancel anytime</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/#pricing">View All Plans</Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
