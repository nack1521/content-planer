import { PageLoading } from '@/components/shell/PageLoading';

export default function SettingsLoading() {
  return (
    <div className="py-8 px-2 sm:px-4 max-w-xl mx-auto space-y-6">
      <PageLoading variant="settings" />
    </div>
  );
}
