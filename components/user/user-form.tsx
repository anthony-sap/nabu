"use client";

/**
 * UserForm Component
 *
 * This component works with react-hook-form:
 *
 * const form = useForm({
 *   resolver: zodResolver(userUpdateSchema),
 *   defaultValues: { firstName: user?.firstName, lastName: user?.lastName }
 * });
 *
 * <UserForm
 *   user={user}
 *   form={form}
 *   onSubmit={form.handleSubmit(onSubmit)}
 * />
 */
import { User, UserRole } from "@prisma/client";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { userCreateSchema, userUpdateSchema } from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";

export type UserFormData =
  | z.infer<typeof userUpdateSchema>
  | z.infer<typeof userCreateSchema>;

export interface UserFormProps {
  user?: User;
  form?: UseFormReturn<UserFormData>;
  isPending?: boolean;
  onSubmit?: (e?: React.FormEvent<HTMLFormElement>) => void;
  dialogClose?: React.ReactNode;
}

export function UserForm({
  user,
  form,
  isPending,
  onSubmit,
  dialogClose,
}: UserFormProps) {
  const possibleRoles = Object.values(UserRole);

  if (!form) {
    return null;
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          <div className="flex w-full gap-2">
            <div className="grid w-full gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                className="flex-1"
                size={32}
                defaultValue={user?.firstName || ""}
                {...form.register("firstName")}
              />
              {form?.formState?.errors?.firstName?.message ? (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {form.formState.errors.firstName.message}
                </p>
              ) : null}
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                className="flex-1"
                size={32}
                defaultValue={user?.lastName || ""}
                {...form.register("lastName")}
              />
              {form?.formState?.errors?.lastName?.message ? (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {form.formState.errors.lastName.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid w-full gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              className="flex-1"
              size={32}
              defaultValue={user?.email || ""}
              disabled={!!user}
              {...form?.register("email")}
            />
            {form?.formState?.errors?.email?.message ? (
              <p className="pb-0.5 text-[13px] text-red-600">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="grid w-full gap-2">
            <FormField
              control={form?.control}
              name="roles"
              defaultValue={
                user?.roles?.length && user?.roles?.length > 0 ? user.roles : []
              }
              render={({ field }) => (
                <FormItem className="w-full space-y-0">
                  <FormLabel className="sr-only">Role</FormLabel>
                  <Select
                    onValueChange={(value: UserRole) => {
                      field.onChange([value]);
                    }}
                    name={field.name}
                    defaultValue={
                      user?.roles?.length && user?.roles?.length > 0
                        ? user.roles[0]
                        : ""
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {possibleRoles.map((role) => (
                        <SelectItem key={role} value={role.toString()}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex w-full gap-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-[67px] shrink-0 px-0 sm:w-[130px]"
            >
              {isPending ? (
                <Icons.spinner className="size-4 animate-spin" />
              ) : (
                <p>
                  Save
                  <span className="hidden sm:inline-flex">&nbsp;Changes</span>
                </p>
              )}
            </Button>
            {dialogClose}
          </div>
        </div>
      </form>
    </Form>
  );
}
