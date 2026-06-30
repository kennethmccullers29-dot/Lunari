import { joinWorkspace } from "@/lib/actions/workspaces";
import { Button } from "@/components/optics/button";
import { Input } from "@/components/optics/input";
import { Field, FieldLabel } from "@/components/ui/field";

export function JoinWorkspaceForm() {
  return (
    <form action={joinWorkspace} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="join-code">Join code</FieldLabel>
        <Input id="join-code" type="text" name="join_code" required placeholder="e.g. 4f9a1c2b" />
      </Field>
      <Button type="submit" variant="secondary" className="w-full">
        Join workspace
      </Button>
    </form>
  );
}
