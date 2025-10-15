'use client';

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Zap,
  Users,
  BarChart,
  Shield,
  Globe,
  Check,
  ArrowRight,
  Star,
  Sparkles,
  Loader2,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const t = useTranslations("landing");
  const router = useRouter();

  // Fetch plans from backend
  const { data: plansData, isLoading: plansLoading } = trpc.plans.list.useQuery({
    includeInactive: false,
    includePrivate: false,
  });

  const features = [
    {
      icon: MessageSquare,
      titleKey: "features.messaging.title",
      descriptionKey: "features.messaging.description",
    },
    {
      icon: Zap,
      titleKey: "features.automation.title",
      descriptionKey: "features.automation.description",
    },
    {
      icon: Users,
      titleKey: "features.contacts.title",
      descriptionKey: "features.contacts.description",
    },
    {
      icon: BarChart,
      titleKey: "features.analytics.title",
      descriptionKey: "features.analytics.description",
    },
    {
      icon: Shield,
      titleKey: "features.security.title",
      descriptionKey: "features.security.description",
    },
    {
      icon: Globe,
      titleKey: "features.multiTenant.title",
      descriptionKey: "features.multiTenant.description",
    },
  ];

  const handleSignup = (planId?: string) => {
    if (planId) {
      router.push(`/signup?plan=${planId}`);
    } else {
      router.push('/signup');
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="relative">
              <MessageSquare className="h-6 w-6 text-primary transition-transform group-hover:scale-110 group-hover:rotate-12" />
              <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              WhatsApp Bot
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-all hover:scale-105"
            >
              {t("nav.features")}
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-all hover:scale-105"
            >
              {t("nav.pricing")}
            </Link>
            <Link
              href="#about"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-all hover:scale-105"
            >
              {t("nav.about")}
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={handleLogin} className="hover:scale-105 transition-transform">
              {t("nav.login")}
            </Button>
            <Button onClick={() => handleSignup()} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all hover:scale-105">
              {t("nav.signup")}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="mx-auto max-w-4xl text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Badge className="mb-4 hover:scale-110 transition-transform cursor-pointer shadow-lg" variant="secondary">
            <Sparkles className="mr-1 h-3 w-3 animate-pulse" />
            {t("hero.badge")}
          </Badge>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
            {t("hero.title")}
          </h1>
          <p className="mb-8 text-lg text-muted-foreground md:text-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
            <Button 
              size="lg" 
              onClick={() => handleSignup()} 
              className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-2xl hover:shadow-primary/50 transition-all hover:scale-110 group"
            >
              {t("hero.cta.primary")}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              asChild 
              className="hover:bg-primary/10 hover:border-primary hover:scale-105 transition-all shadow-lg"
            >
              <Link href="#pricing">{t("hero.cta.secondary")}</Link>
            </Button>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 animate-in fade-in duration-1000 delay-700">
            <div className="flex items-center gap-2 group">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background hover:scale-125 transition-transform cursor-pointer shadow-lg"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star 
                      key={i} 
                      className="h-4 w-4 fill-yellow-400 text-yellow-400 hover:scale-125 transition-transform cursor-pointer" 
                      style={{ animationDelay: `${i * 0.05}s` }}
                    />
                  ))}
                </div>
                <p className="text-muted-foreground group-hover:text-foreground transition-colors">{t("hero.rating")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-24 md:py-32 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="mx-auto max-w-2xl text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            {t("features.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("features.subtitle")}
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-2 hover:border-primary hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 hover:scale-105 group cursor-pointer animate-in fade-in slide-in-from-bottom-4" 
              style={{ animationDelay: `${index * 0.1}s`, animationDuration: '0.5s' }}
            >
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all group-hover:scale-110 group-hover:rotate-6 shadow-lg">
                  <feature.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">{t(feature.titleKey)}</CardTitle>
                <CardDescription className="group-hover:text-foreground transition-colors">{t(feature.descriptionKey)}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 rounded-full blur-3xl animate-pulse" />
        </div>
        <div className="mx-auto max-w-2xl text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            {t("pricing.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("pricing.subtitle")}
          </p>
        </div>

        {plansLoading ? (
          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="flex flex-col animate-pulse">
                <CardHeader>
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-12 w-32 mt-4" />
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : plansData?.plans && plansData.plans.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {plansData.plans.map((plan: any, index: number) => {
              const isFree = parseFloat(plan.price) === 0;
              const isPopular = index === 1; // Middle plan is popular

              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col group hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 ${
                    isPopular
                      ? "border-primary shadow-2xl shadow-primary/30 scale-105 bg-gradient-to-br from-primary/5 to-transparent"
                      : "border-2 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10"
                  }`}
                  style={{ animationDelay: `${index * 0.2}s`, animationDuration: '0.6s' }}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:scale-110 transition-transform animate-pulse">
                        <Sparkles className="mr-1 h-3 w-3" />
                        {t("pricing.popular")}
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                      {typeof plan.name === 'object' && plan.name !== null 
                        ? (plan.name as any).en || (plan.name as any).ar || 'Plan'
                        : plan.name}
                    </CardTitle>
                    <CardDescription className="group-hover:text-foreground transition-colors">
                      {typeof plan.description === 'object' && plan.description !== null
                        ? (plan.description as any).en || (plan.description as any).ar || ''
                        : plan.description || ''}
                    </CardDescription>
                    <div className="mt-4 group-hover:scale-110 transition-transform origin-left">
                      <span className={`text-4xl font-bold bg-gradient-to-r ${isPopular ? 'from-primary to-primary/60' : 'from-foreground to-foreground/80'} bg-clip-text text-transparent`}>
                        {isFree ? '$0' : `$${plan.price}`}
                      </span>
                      {!isFree && (
                        <span className="text-muted-foreground">
                          {t("pricing.perMonth")}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.maxMessagesPerMonth && (
                        <li className="flex items-center gap-2 group/item hover:translate-x-1 transition-transform">
                          <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center group-hover/item:bg-primary/20 transition-colors">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm group-hover/item:text-foreground transition-colors">
                            {plan.maxMessagesPerMonth === 999999 
                              ? 'Unlimited messages'
                              : `${plan.maxMessagesPerMonth.toLocaleString()} messages/month`}
                          </span>
                        </li>
                      )}
                      {plan.maxWhatsappInstances && (
                        <li className="flex items-center gap-2 group/item hover:translate-x-1 transition-transform">
                          <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center group-hover/item:bg-primary/20 transition-colors">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm group-hover/item:text-foreground transition-colors">
                            {plan.maxWhatsappInstances === 999999
                              ? 'Unlimited WhatsApp instances'
                              : `${plan.maxWhatsappInstances} WhatsApp instance${plan.maxWhatsappInstances > 1 ? 's' : ''}`}
                          </span>
                        </li>
                      )}
                      {plan.maxUsers && (
                        <li className="flex items-center gap-2 group/item hover:translate-x-1 transition-transform">
                          <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center group-hover/item:bg-primary/20 transition-colors">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm group-hover/item:text-foreground transition-colors">
                            {plan.maxUsers === 999999
                              ? 'Unlimited users'
                              : `Up to ${plan.maxUsers} user${plan.maxUsers > 1 ? 's' : ''}`}
                          </span>
                        </li>
                      )}
                      <li className="flex items-center gap-2 group/item hover:translate-x-1 transition-transform">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center group-hover/item:bg-primary/20 transition-colors">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm group-hover/item:text-foreground transition-colors">
                          {isFree ? 'Community support' : 'Priority email support'}
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className={`w-full group/button hover:scale-105 transition-all shadow-lg ${
                        isPopular 
                          ? 'bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:shadow-primary/50' 
                          : 'hover:shadow-primary/30'
                      }`}
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleSignup(plan.id)}
                    >
                      {isFree ? 'Start Free' : 'Get Started'}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/button:translate-x-1 transition-transform" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 animate-in fade-in duration-500">
            <p className="text-muted-foreground">No plans available at the moment.</p>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="container py-24 md:py-32">
        <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-3xl md:text-4xl font-bold">
              {t("cta.title")}
            </CardTitle>
            <CardDescription className="text-lg">
              {t("cta.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button size="lg" onClick={() => handleSignup()}>
              {t("cta.button")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardFooter>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="font-bold">WhatsApp Bot</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("footer.description")}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t("footer.product.title")}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#features"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t("footer.product.features")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t("footer.product.pricing")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t("footer.company.title")}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#about"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t("footer.company.about")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t("footer.company.contact")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t("footer.legal.title")}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t("footer.legal.privacy")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t("footer.legal.terms")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            {t("footer.copyright")}
          </div>
        </div>
      </footer>
    </div>
  );
}
