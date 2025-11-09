"use client";

import { useState, useTransition } from "react";
import { updateUserName, type FormData } from "@/actions/update-user-name";
import { zodResolver } from "@hookform/resolvers/zod";
import { useKindeAuth } from "@kinde-oss/kinde-auth-nextjs";
import { User } from "@prisma/client";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { userNameSchema } from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionColumns } from "@/components/dashboard/section-columns";
import { Icons } from "@/components/shared/icons";

interface UserNameFormProps {
  user: Pick<User, "id" | "firstName" | "lastName">;
}

export function UserNameForm({ user }: UserNameFormProps) {
  const { refreshData } = useKindeAuth();
  const [updatedFirstName, setUpdatedFirstName] = useState(false);
  const [updatedLastName, setUpdatedLastName] = useState(false);
  const [isPending, startTransition] = useTransition();
  const updateUserNameWithId = updateUserName.bind(null, user.id);

  const checkUpdate = (type: "firstName" | "lastName", value: string) => {
    if (type === "firstName") {
      setUpdatedFirstName(user.firstName !== value);
    } else {
      setUpdatedLastName(user.lastName !== value);
    }
  };

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(userNameSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
    },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const { status } = await updateUserNameWithId(data);

      if (status !== "success") {
        toast.error("Something went wrong.", {
          description: "Your name was not updated. Please try again.",
        });
      } else {
        await refreshData();
        setUpdatedFirstName(false);
        setUpdatedLastName(false);
        toast.success("Your name has been updated.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <SectionColumns
        title="Your Name"
        description="Please enter a display name you are comfortable with."
      >
        <div className="flex w-full items-center gap-2">
          <div className="flex gap-2">
            <div>
              <Label className="sr-only" htmlFor="firstName">
                First name
              </Label>
              <Input
                id="firstName"
                className="flex-1"
                size={32}
                {...register("firstName")}
                onChange={(e) => checkUpdate("firstName", e.target.value)}
              />
              {errors?.firstName && (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label className="sr-only" htmlFor="lastName">
                Last name
              </Label>
              <Input
                id="lastName"
                className="flex-1"
                size={32}
                {...register("lastName")}
                onChange={(e) => checkUpdate("lastName", e.target.value)}
              />
              {errors?.lastName && (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>
          <Button
            type="submit"
            variant={
              updatedFirstName || updatedLastName ? "default" : "disable"
            }
            disabled={isPending || (!updatedFirstName && !updatedLastName)}
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
        </div>
        <div className="flex flex-col justify-between p-1">
          <p className="text-muted-foreground text-[13px]">Max 32 characters</p>
        </div>
      </SectionColumns>
    </form>
  );
}
