/**
 * UsageStatistics Component
 * Displays subscription usage metrics with progress bars
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Calendar, HardDrive, Sparkles } from 'lucide-react';

interface UsageStats {
  staff: {
    current: number;
    max: number | null;
    percentage: number;
  };
  bookings: {
    current: number;
    max: number | null;
    percentage: number;
    resetDate?: Date;
  };
  storage: {
    current: number;
    max: number | null;
    percentage: number;
  };
  aiCredits: {
    current: number;
    max: number | null;
    percentage: number;
    resetDate?: Date;
  };
}

interface UsageStatisticsProps {
  usage: UsageStats;
}

export function UsageStatistics({ usage }: UsageStatisticsProps) {
  const formatLimit = (max: number | null) => {
    return max === null ? 'Unlimited' : max.toString();
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatResetDate = (date?: Date) => {
    if (!date) return '';
    const resetDate = new Date(date);
    const days = Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return `Resets in ${days} ${days === 1 ? 'day' : 'days'}`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Staff Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {usage.staff.current} / {formatLimit(usage.staff.max)}
          </div>
          {usage.staff.max !== null && (
            <>
              <Progress
                value={usage.staff.percentage}
                className="mt-2"
                indicatorClassName={getProgressColor(usage.staff.percentage)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {usage.staff.percentage}% used
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bookings Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bookings This Month</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {usage.bookings.current} / {formatLimit(usage.bookings.max)}
          </div>
          {usage.bookings.max !== null && (
            <>
              <Progress
                value={usage.bookings.percentage}
                className="mt-2"
                indicatorClassName={getProgressColor(usage.bookings.percentage)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {usage.bookings.percentage}% used
                {usage.bookings.resetDate && ` • ${formatResetDate(usage.bookings.resetDate)}`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {usage.storage.current.toFixed(2)} GB / {formatLimit(usage.storage.max)} GB
          </div>
          {usage.storage.max !== null && (
            <>
              <Progress
                value={usage.storage.percentage}
                className="mt-2"
                indicatorClassName={getProgressColor(usage.storage.percentage)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {usage.storage.percentage}% used
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Credits Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Credits</CardTitle>
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {usage.aiCredits.current} / {formatLimit(usage.aiCredits.max)}
          </div>
          {usage.aiCredits.max !== null && (
            <>
              <Progress
                value={usage.aiCredits.percentage}
                className="mt-2"
                indicatorClassName={getProgressColor(usage.aiCredits.percentage)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {usage.aiCredits.percentage}% used
                {usage.aiCredits.resetDate && ` • ${formatResetDate(usage.aiCredits.resetDate)}`}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
