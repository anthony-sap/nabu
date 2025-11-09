import { useState, useTransition } from "react";
import { updateUserStatus } from "@/actions/users";
import { StatusEnum, User } from "@prisma/client";
import { Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export interface UserStatusActionModalProps {
  user: User;
}

export function UserStatusActionModal({ user }: UserStatusActionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateUserStatusWithId = updateUserStatus.bind(null, user.id);
  const [isPending, startTransition] = useTransition();

  const statusChangeHandler = (status: StatusEnum) => {
    startTransition(async () => {
      const submitResponse = await updateUserStatusWithId(status);
      if (submitResponse?.status === StatusEnum.ENABLE) {
        toast.success("User activated successfully");
      } else if (submitResponse?.status === StatusEnum.DISABLE) {
        toast.success("User deactivated successfully");
      } else {
        toast.error("Failed to update user status");
      }
      setIsOpen(false);
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full">
          {user?.status === StatusEnum.ENABLE ? (
            <div className="flex w-full items-center gap-2">
              <Ban className="size-4" />
              Deactivate
            </div>
          ) : (
            <div className="flex w-full items-center gap-2">
              <CheckCircle2 className="size-4" />
              Activate
            </div>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to{" "}
            {user?.status === StatusEnum.ENABLE ? "deactivate" : "activate"}{" "}
            this user?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user?.status === StatusEnum.ENABLE
              ? "This action will prevent the user from logging in to the system."
              : "This action will give the user access to the system."}
            <br />
            <br />
            {`Name: ${user?.firstName} ${user?.lastName}`}
            <br />
            {`Email: ${user?.email}`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              statusChangeHandler(
                user?.status === StatusEnum.ENABLE
                  ? StatusEnum.DISABLE
                  : StatusEnum.ENABLE,
              );
            }}
          >
            {isPending ? (
              <Icons.spinner className="size-4 animate-spin" />
            ) : (
              <p>
                {user?.status === StatusEnum.ENABLE ? "Deactivate" : "Activate"}
              </p>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
