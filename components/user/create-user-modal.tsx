"use client";

import { useState, useTransition } from "react";
import { createUser } from "@/actions/users";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { userCreateSchema } from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserForm } from "@/components/user/user-form";

export default function CreateUserModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof userCreateSchema>>({
    resolver: zodResolver(userCreateSchema),
  });

  const onSubmit = form.handleSubmit(
    (data: z.infer<typeof userCreateSchema>) => {
      startTransition(async () => {
        const submitResponse = await createUser(data);
        if (submitResponse?.id) {
          toast.success("User created successfully");
        }
        setIsOpen(false);
      });
    },
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="w-full">
          <div className="flex w-full items-center gap-2">
            <Plus className="size-4" />
            Create User
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-4">Create new user</DialogTitle>
          <DialogDescription></DialogDescription>
          <UserForm
            form={form}
            onSubmit={onSubmit}
            isPending={isPending}
            dialogClose={
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
            }
          />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
