import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const businessSignupSchema = z.object({
  // Personal Information
  email: z.string().email('Invalid email format'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),

  // Business Information
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.enum(['restaurant', 'hotel', 'bakery', 'supermarket', 'cafe', 'caterer']),
  businessAddress: z.string().min(10, 'Please provide a complete address'),
  businessPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid business phone number'),
  businessDescription: z.string().min(20, 'Please provide a detailed description'),
  
  // Operating Hours
  operatingHours: z.object({
    monday: z.string(),
    tuesday: z.string(), 
    wednesday: z.string(),
    thursday: z.string(),
    friday: z.string(),
    saturday: z.string(),
    sunday: z.string()
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type BusinessSignupForm = z.infer<typeof businessSignupSchema>;

export default function BusinessSignup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<BusinessSignupForm>({
    resolver: zodResolver(businessSignupSchema),
    defaultValues: {
      businessType: 'restaurant',
      operatingHours: {
        monday: '9:00 AM - 6:00 PM',
        tuesday: '9:00 AM - 6:00 PM',
        wednesday: '9:00 AM - 6:00 PM',
        thursday: '9:00 AM - 6:00 PM',
        friday: '9:00 AM - 6:00 PM',
        saturday: '10:00 AM - 4:00 PM',
        sunday: 'Closed'
      }
    }
  });

  const signupMutation = useMutation({
    mutationFn: async (data: BusinessSignupForm) => {
      const response = await fetch('/api/auth/register/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          documents: uploadedDocuments,
          accountType: 'business'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful!",
        description: "Your business application has been submitted for review. You'll receive an email notification once verified."
      });
      setCurrentStep(4); // Success step
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again later",
        variant: "destructive"
      });
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'business-documents');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: (data) => {
      setUploadedDocuments(prev => [...prev, data.url]);
      toast({
        title: "Document Uploaded",
        description: "Document uploaded successfully"
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB",
          variant: "destructive"
        });
        return;
      }
      uploadMutation.mutate(file);
    }
  };

  const onSubmit = (data: BusinessSignupForm) => {
    if (uploadedDocuments.length === 0) {
      toast({
        title: "Documents Required",
        description: "Please upload at least one business document",
        variant: "destructive"
      });
      return;
    }
    signupMutation.mutate(data);
  };

  const nextStep = () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    form.trigger(fieldsToValidate as any).then((isValid) => {
      if (isValid) {
        setCurrentStep(prev => prev + 1);
      }
    });
  };

  const getFieldsForStep = (step: number) => {
    switch (step) {
      case 1:
        return ['email', 'fullName', 'phone', 'password', 'confirmPassword'];
      case 2:
        return ['businessName', 'businessType', 'businessAddress', 'businessPhone', 'businessDescription'];
      case 3:
        return [];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-green-800">
            Register Your Business with Looper
          </CardTitle>
          <CardDescription className="text-center">
            Join the movement to reduce food waste and grow your revenue
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Progress Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-4">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentStep >= step 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                    }`}
                >
                  {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                      data-testid="input-email"
                    />
                    {form.formState.errors.email && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      {...form.register('fullName')}
                      data-testid="input-fullname"
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+234..."
                      {...form.register('phone')}
                      data-testid="input-phone"
                    />
                    {form.formState.errors.phone && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      {...form.register('password')}
                      data-testid="input-password"
                    />
                    {form.formState.errors.password && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...form.register('confirmPassword')}
                      data-testid="input-confirm-password"
                    />
                    {form.formState.errors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={nextStep}
                  className="w-full"
                  data-testid="button-next"
                >
                  Next Step
                </Button>
              </div>
            )}

            {/* Step 2: Business Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    {...form.register('businessName')}
                    data-testid="input-business-name"
                  />
                  {form.formState.errors.businessName && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.businessName.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessType">Business Type *</Label>
                    <Select onValueChange={(value) => form.setValue('businessType', value as any)}>
                      <SelectTrigger data-testid="select-business-type">
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="bakery">Bakery</SelectItem>
                        <SelectItem value="supermarket">Supermarket</SelectItem>
                        <SelectItem value="cafe">Cafe</SelectItem>
                        <SelectItem value="caterer">Catering Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="businessPhone">Business Phone *</Label>
                    <Input
                      id="businessPhone"
                      type="tel"
                      {...form.register('businessPhone')}
                      data-testid="input-business-phone"
                    />
                    {form.formState.errors.businessPhone && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.businessPhone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="businessAddress">Business Address *</Label>
                  <Textarea
                    id="businessAddress"
                    {...form.register('businessAddress')}
                    placeholder="Complete business address including city and state"
                    data-testid="textarea-business-address"
                  />
                  {form.formState.errors.businessAddress && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.businessAddress.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="businessDescription">Business Description *</Label>
                  <Textarea
                    id="businessDescription"
                    {...form.register('businessDescription')}
                    placeholder="Describe your business, cuisine type, and what makes you unique"
                    data-testid="textarea-business-description"
                  />
                  {form.formState.errors.businessDescription && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.businessDescription.message}
                    </p>
                  )}
                </div>

                <div className="flex space-x-4">
                  <Button 
                    type="button" 
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    className="flex-1"
                    data-testid="button-next"
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Document Upload */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Business Verification Documents</h3>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium mb-2">Upload Business Documents</p>
                  <p className="text-gray-600 mb-4">
                    Upload business registration, tax certificate, or other verification documents
                  </p>
                  
                  <input
                    type="file"
                    id="document-upload"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    data-testid="input-document-upload"
                  />
                  
                  <Button
                    type="button"
                    onClick={() => document.getElementById('document-upload')?.click()}
                    disabled={uploadMutation.isPending}
                    data-testid="button-upload-document"
                  >
                    {uploadMutation.isPending ? 'Uploading...' : 'Choose Files'}
                  </Button>
                  
                  <p className="text-sm text-gray-500 mt-2">
                    Maximum file size: 10MB. Supported formats: PDF, JPG, PNG
                  </p>
                </div>

                {uploadedDocuments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Uploaded Documents:</h4>
                    {uploadedDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Document {index + 1} uploaded successfully</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex space-x-4">
                  <Button 
                    type="button" 
                    onClick={() => setCurrentStep(2)}
                    variant="outline"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1"
                    disabled={signupMutation.isPending || uploadedDocuments.length === 0}
                    data-testid="button-submit"
                  >
                    {signupMutation.isPending ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {currentStep === 4 && (
              <div className="text-center space-y-4">
                <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
                <h3 className="text-xl font-semibold text-green-800">Application Submitted Successfully!</h3>
                <p className="text-gray-600">
                  Thank you for joining Looper! Your business application is now under review. 
                  Our team will verify your documents and get back to you within 24-48 hours.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">What happens next?</h4>
                  <ul className="text-sm text-blue-700 space-y-1 text-left">
                    <li>• Our team reviews your business information and documents</li>
                    <li>• You'll receive an email notification once verified</li>
                    <li>• Access your business dashboard to start creating food listings</li>
                    <li>• Begin reducing food waste and earning additional revenue</li>
                  </ul>
                </div>
                <Button
                  type="button"
                  onClick={() => window.location.href = '/'}
                  data-testid="button-home"
                >
                  Return to Home
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}