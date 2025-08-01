import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '../hooks/use-toast';
import { CheckCircle, AlertCircle, Clock, Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface Industry {
  id: string;
  name: string;
  description: string;
  features: string[];
  isAvailable: boolean;
  comingSoon?: boolean;
  icon?: string;
  examples?: string[];
}

interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  fields: Array<{
    name: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'multiselect' | 'textarea' | 'number';
    label: string;
    required: boolean;
    options?: string[];
    placeholder?: string;
  }>;
  estimatedTime: string;
}

interface RegistrationData {
  businessName: string;
  industry: string;
  email: string;
  phone: string;
  address?: any;
  additionalInfo?: Record<string, any>;
}

export function ModularBusinessRegistration({ onComplete }: { onComplete?: (data: any) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([]);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    businessName: '',
    industry: '',
    email: '',
    phone: '',
    additionalInfo: {}
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableIndustries();
  }, []);

  useEffect(() => {
    if (selectedIndustry) {
      loadOnboardingSteps(selectedIndustry);
      setRegistrationData(prev => ({ ...prev, industry: selectedIndustry }));
    }
  }, [selectedIndustry]);

  const loadAvailableIndustries = async () => {
    try {
      const response = await fetch('/api/modular/registration/industries');
      if (response.ok) {
        const data = await response.json();
        setIndustries(data.industries);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load available industries",
        variant: "destructive"
      });
    }
  };

  const loadOnboardingSteps = async (industry: string) => {
    try {
      const response = await fetch(`/api/modular/registration/onboarding/${industry}`);
      if (response.ok) {
        const data = await response.json();
        setOnboardingSteps(data.steps);
      }
    } catch (error) {
      console.error('Failed to load onboarding steps:', error);
    }
  };

  const handleIndustrySelect = (industryId: string) => {
    setSelectedIndustry(industryId);
    setCurrentStep(1); // Move to first onboarding step
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    if (fieldName.includes('.')) {
      // Handle nested fields (e.g., additionalInfo.serviceTypes)
      const [parent, child] = fieldName.split('.');
      setRegistrationData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof RegistrationData],
          [child]: value
        }
      }));
    } else {
      setRegistrationData(prev => ({
        ...prev,
        [fieldName]: value
      }));
    }
  };

  const validateCurrentStep = async () => {
    if (currentStep === 0) return true; // Industry selection step

    const currentStepData = onboardingSteps[currentStep - 1];
    const requiredFields = currentStepData.fields.filter(field => field.required);
    
    for (const field of requiredFields) {
      const value = field.name.includes('.') 
        ? registrationData.additionalInfo?.[field.name.split('.')[1]]
        : registrationData[field.name as keyof RegistrationData];
      
      if (!value || (Array.isArray(value) && value.length === 0)) {
        setErrors([`${field.label} is required`]);
        return false;
      }
    }

    setErrors([]);
    return true;
  };

  const handleNext = async () => {
    if (await validateCurrentStep()) {
      if (currentStep < onboardingSteps.length) {
        setCurrentStep(prev => prev + 1);
      } else {
        await submitRegistration();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setErrors([]);
    }
  };

  const submitRegistration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/modular/registration/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Registration Successful!",
          description: "Your business has been registered successfully",
        });
        onComplete?.(data);
      } else {
        setErrors(data.details || [data.error || 'Registration failed']);
        setWarnings(data.warnings || []);
        if (data.requiredFields?.length > 0) {
          // Go back to the step with missing required fields
          setCurrentStep(1);
        }
      }
    } catch (error) {
      toast({
        title: "Registration Error",
        description: "An unexpected error occurred during registration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (currentStep === 0) {
    return <IndustrySelectionStep industries={industries} onSelect={handleIndustrySelect} />;
  }

  const currentStepData = onboardingSteps[currentStep - 1];
  const progress = ((currentStep) / (onboardingSteps.length + 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Step {currentStep} of {onboardingSteps.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>{currentStepData?.title}</span>
            <Badge variant="outline">{currentStepData?.estimatedTime}</Badge>
          </CardTitle>
          <CardDescription>{currentStepData?.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Errors and Warnings */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Form Fields */}
          <div className="grid gap-4">
            {currentStepData?.fields.map(field => (
              <FormField
                key={field.name}
                field={field}
                value={field.name.includes('.') 
                  ? registrationData.additionalInfo?.[field.name.split('.')[1]]
                  : registrationData[field.name as keyof RegistrationData]
                }
                onChange={(value) => handleFieldChange(field.name, value)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Previous
        </Button>

        <Button 
          onClick={handleNext} 
          disabled={loading}
          className="min-w-[100px]"
        >
          {loading ? (
            "Processing..."
          ) : currentStep === onboardingSteps.length ? (
            "Complete Registration"
          ) : (
            "Next"
          )}
        </Button>
      </div>
    </div>
  );
}

function IndustrySelectionStep({ industries, onSelect }: { 
  industries: Industry[]; 
  onSelect: (industryId: string) => void; 
}) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Choose Your Industry</h1>
        <p className="text-gray-600">
          Select the industry that best describes your business to get started with the right features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {industries.map(industry => (
          <Card 
            key={industry.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              !industry.isAvailable && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => industry.isAvailable && onSelect(industry.id)}
          >
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">{industry.icon || '🏢'}</div>
              <CardTitle className="text-lg flex items-center justify-center space-x-2">
                <span>{industry.name}</span>
                {!industry.isAvailable && industry.comingSoon && (
                  <Badge variant="secondary">Coming Soon</Badge>
                )}
                {industry.isAvailable && (
                  <Badge variant="default">Available</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {industry.description}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {industry.examples && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Examples:</div>
                    <div className="text-xs text-gray-600">
                      {industry.examples.join(', ')}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Features:</div>
                  <div className="flex flex-wrap gap-1">
                    {industry.features.slice(0, 3).map(feature => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {industry.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{industry.features.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FormField({ field, value, onChange }: {
  field: OnboardingStep['fields'][0];
  value: any;
  onChange: (value: any) => void;
}) {
  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(parseInt(e.target.value) || '')}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.name}-${option}`}
                  checked={Array.isArray(value) && value.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (checked) {
                      onChange([...currentValues, option]);
                    } else {
                      onChange(currentValues.filter((v: string) => v !== option));
                    }
                  }}
                />
                <Label htmlFor={`${field.name}-${option}`} className="text-sm">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name} className="flex items-center space-x-1">
        <span>{field.label}</span>
        {field.required && <span className="text-red-500">*</span>}
      </Label>
      {renderInput()}
    </div>
  );
}