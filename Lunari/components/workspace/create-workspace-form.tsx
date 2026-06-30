import { createWorkspace } from "@/lib/actions/workspaces";
import { Button } from "@/components/optics/button";
import { Input } from "@/components/optics/input";
import { Field, FieldLabel } from "@/components/ui/field";

export function CreateWorkspaceForm() {
  return (
    <form action={createWorkspace} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
        <Input id="workspace-name" type="text" name="name" required placeholder="Acme Inc" />
      </Field>
      <Button type="submit" className="w-full">
        Create workspace
      </Button>
    </form>
  );
}
