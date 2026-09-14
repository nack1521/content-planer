import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TasksView } from '@/components/tasks/TasksView';
import { getTasksAction } from '@/app/actions/tasks';
import { getContentItemsAction, getContentPillarsAction } from '@/app/actions/content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  if (resolvedParams.locale !== 'th' && resolvedParams.locale !== 'en') {
    notFound();
  }
  const isThai = resolvedParams.locale === 'th';

  return {
    title: isThai
      ? 'งานโปรดักชัน — Content Planner'
      : 'Production Tasks — Content Planner',
    description: isThai
      ? 'จัดการงานผลิตและขั้นตอนการทำงานคอนเทนต์'
      : 'Manage production tasks and content workflows',
  };
}

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  if (resolvedParams.locale !== 'th' && resolvedParams.locale !== 'en') {
    notFound();
  }

  // Server-side initial reads
  const [tasksRes, itemsRes, pillarsRes] = await Promise.all([
    getTasksAction(),
    getContentItemsAction(),
    getContentPillarsAction(),
  ]);

  return (
    <TasksView
      initialTasks={tasksRes.error ? undefined : tasksRes.tasks}
      initialContentItems={itemsRes.error ? undefined : itemsRes.items}
      initialPillars={pillarsRes.error ? undefined : pillarsRes.pillars}
      initialError={tasksRes.error === 'unauthorized' ? null : tasksRes.error || itemsRes.error}
    />
  );
}
