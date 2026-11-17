import { EntryEditor } from "@/components/entry-editor";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EntryEditor key={id} id={id} />;
}
