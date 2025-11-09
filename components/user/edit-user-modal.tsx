"use client";

import { useTransition } from "react";
import { updateUser } from "@/actions/users";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "@prisma/client";
import { PenBox } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { userUpdateSchema } from "@/lib/validations/user";
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

export interface EditUserModalProps {
  user: User;
}

export default function EditUserModal({ user }: EditUserModalProps) {
  const updateUserWithId = updateUser.bind(null, user.id);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof userUpdateSchema>>({
    resolver: zodResolver(userUpdateSchema),
  });

  const onSubmit = form.handleSubmit(
    (data: z.infer<typeof userUpdateSchema>) => {
      startTransition(async () => {
        const submitResponse = await updateUserWithId(data);
        if (submitResponse?.id) {
          toast.success("User updated successfully");
        }
      });
    },
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full">
          <div className="flex w-full items-center gap-2">
            <PenBox className="size-4" />
            Edit
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-4">Edit user</DialogTitle>
          <DialogDescription></DialogDescription>
          <UserForm
            user={user}
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
