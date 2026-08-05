import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import {
  Mail,
  Send,
  UserPlus,
  Smartphone,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.aurocode.tax_ease';

export default function InviteClient() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentEmails, setSentEmails] = useState<{ email: string; name: string; time: Date }[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({ title: 'Email Required', description: 'Please enter the client email address.', variant: 'destructive' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      await apiService.inviteClient({
        email: email.trim(),
        client_name: clientName.trim() || undefined,
        personal_message: personalMessage.trim() || undefined,
      });

      setSentEmails((prev) => [
        { email: email.trim(), name: clientName.trim() || email.trim(), time: new Date() },
        ...prev,
      ]);

      toast({
        title: 'Invitation Sent!',
        description: `Invitation email sent to ${email.trim()}`,
      });

      setEmail('');
      setClientName('');
      setPersonalMessage('');
    } catch (error: any) {
      toast({
        title: 'Failed to Send',
        description: error.message || 'Could not send the invitation email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(PLAY_STORE_URL);
      setCopiedLink(true);
      toast({ title: 'Link Copied', description: 'Play Store link copied to clipboard.' });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ title: 'Copy Failed', description: 'Could not copy to clipboard', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout
      title="Invite Client"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Invite Client' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Invite Client</h1>
            <p className="text-muted-foreground text-sm">
              Send an invitation email with app download link and onboarding instructions
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Invite Form */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Send Invitation
                </CardTitle>
                <CardDescription>
                  The client will receive a professional email with the Play Store link, account creation steps, and how to start their personal tax filing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendInvite} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Client Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="client@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isSending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Client Name (optional)</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Smith"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      disabled={isSending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Used to personalize the greeting in the email.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Personal Message (optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Hi! I'd like to invite you to use our app for your tax filing this year..."
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      disabled={isSending}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Add a personal note that will appear in the invitation email.
                    </p>
                  </div>

                  <Button type="submit" disabled={isSending} className="w-full">
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending Invitation...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Invitation Email
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Recently Sent */}
            {sentEmails.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Recently Sent ({sentEmails.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sentEmails.map((sent, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{sent.name}</p>
                          <p className="text-xs text-muted-foreground">{sent.email}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {sent.time.toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* App Link Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  App Download Link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted rounded-lg text-xs break-all font-mono">
                  {PLAY_STORE_URL}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyLink}>
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copy Link
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* What the email includes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What the Email Includes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Play Store download link (working link)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Step-by-step account creation guide</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Email verification instructions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>How to start personal tax filing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Document upload & submission steps</span>
                  </li>
                  {personalMessage && (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>Your personal message</span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
