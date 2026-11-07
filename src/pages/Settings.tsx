import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { User, Building, Bell, DollarSign, Save } from 'lucide-react';
import { api } from '@/services/api';
import { describeApiError } from '@/lib/apiError';

export default function Settings() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '(416) 555-0000',
  });

  const [firm, setFirm] = useState({
    name: 'TaxPro CA Firm',
    address: '123 Bay Street, Toronto, ON M5J 2T3',
    phone: '(416) 555-1000',
    email: 'info@taxpro.ca',
    website: 'www.taxpro.ca',
  });

  const [notifications, setNotifications] = useState({
    emailNewClient: true,
    emailDocumentUpload: true,
    emailPaymentReceived: true,
    pushNotifications: false,
  });

  const [pricing, setPricing] = useState({
    basicReturn: '350',
    complexReturn: '500',
    businessReturn: '750',
    gstRate: '13',
  });

  // Default filing year: the one setting here that is stored on the server and used (Add Client).
  const [filingYear, setFilingYear] = useState<string>('');
  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const [yearSaved, setYearSaved] = useState<number | null>(null);
  const [isSavingYear, setIsSavingYear] = useState(false);

  useEffect(() => {
    api.getDefaultFilingYear()
      .then((r) => { setFilingYear(String(r.year)); setYearSaved(r.year); setYearOptions(r.options); })
      .catch(() => {});
  }, []);

  const handleSaveYear = async () => {
    setIsSavingYear(true);
    try {
      const r = await api.setDefaultFilingYear(parseInt(filingYear));
      setYearSaved(r.year);
      setYearOptions(r.options);
      toast({ title: 'Default Filing Year Saved', description: `New clients added from the dashboard will use ${r.year}.` });
    } catch (err) {
      toast({ title: 'Could not save', description: describeApiError(err, 'Failed to save the default filing year.'), variant: 'destructive' });
    } finally {
      setIsSavingYear(false);
    }
  };

  // The other sections on this page are a preview: nothing is stored yet, so say so instead of
  // claiming "Settings Saved".
  const handleSave = (section: string) => {
    toast({
      title: 'Not saved yet',
      description: `${section} settings are a preview. Changes here are not stored yet.`,
    });
  };

  return (
    <DashboardLayout
      title="Settings"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
    >
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          {isSuperAdmin() && (
            <TabsTrigger value="firm">
              <Building className="h-4 w-4 mr-2" />
              Firm Details
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          {isSuperAdmin() && (
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your personal information and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={user?.role || ''} disabled className="bg-muted" />
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={() => handleSave('Profile')}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password regularly for security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" />
                </div>
              </div>
              <div className="pt-4">
                <Button variant="outline" onClick={() => handleSave('Password')}>
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Firm Details Tab */}
        {isSuperAdmin() && (
          <TabsContent value="firm">
            <Card>
              <CardHeader>
                <CardTitle>Firm Details</CardTitle>
                <CardDescription>Update your CA firm's information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Firm Name</Label>
                    <Input
                      value={firm.name}
                      onChange={(e) => setFirm({ ...firm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Phone</Label>
                    <Input
                      value={firm.phone}
                      onChange={(e) => setFirm({ ...firm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={firm.address}
                      onChange={(e) => setFirm({ ...firm, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Email</Label>
                    <Input
                      type="email"
                      value={firm.email}
                      onChange={(e) => setFirm({ ...firm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={firm.website}
                      onChange={(e) => setFirm({ ...firm, website: e.target.value })}
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <Button onClick={() => handleSave('Firm')}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Tax Year Settings</CardTitle>
                <CardDescription>Configure the default tax year for new filings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-xs">
                  <Label>Default Filing Year</Label>
                  <Select value={filingYear} onValueChange={setFilingYear} disabled={!isSuperAdmin || !yearOptions.length}>
                    <SelectTrigger>
                      <SelectValue placeholder="Loading..." />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Used when you add a client from the dashboard. Clients who file through the app are not affected.
                    {!isSuperAdmin && ' Only a superadmin can change this.'}
                  </p>
                </div>
                {isSuperAdmin && (
                  <Button onClick={handleSaveYear} disabled={isSavingYear || !filingYear || parseInt(filingYear) === yearSaved}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSavingYear ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Client Registration</p>
                    <p className="text-sm text-muted-foreground">
                      Receive an email when a new client signs up
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNewClient}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailNewClient: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Document Uploads</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when clients upload documents
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailDocumentUpload}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailDocumentUpload: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Payment Received</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notification when payment is received
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailPaymentReceived}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailPaymentReceived: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive browser push notifications
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, pushNotifications: checked })
                    }
                  />
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={() => handleSave('Notifications')}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        {isSuperAdmin() && (
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Default Pricing</CardTitle>
                <CardDescription>Set default pricing for tax filing services.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Basic T1 Return ($)</Label>
                    <Input
                      type="number"
                      value={pricing.basicReturn}
                      onChange={(e) => setPricing({ ...pricing, basicReturn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Complex T1 Return ($)</Label>
                    <Input
                      type="number"
                      value={pricing.complexReturn}
                      onChange={(e) => setPricing({ ...pricing, complexReturn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Return ($)</Label>
                    <Input
                      type="number"
                      value={pricing.businessReturn}
                      onChange={(e) => setPricing({ ...pricing, businessReturn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GST/HST Rate (%)</Label>
                    <Input
                      type="number"
                      value={pricing.gstRate}
                      onChange={(e) => setPricing({ ...pricing, gstRate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <Button onClick={() => handleSave('Pricing')}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Pricing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
}
