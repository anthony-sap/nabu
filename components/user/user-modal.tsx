"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getDisplayDateTime } from "@/components/formatters";

export interface UserModalProps {
  user: User;
}

export default function UserModal({ user }: UserModalProps) {
  const [open, setOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="default" className="bg-green-500">
            Active
          </Badge>
        );
      case "INACTIVE":
        return <Badge variant="secondary">Inactive</Badge>;
      case "SUSPENDED":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoleBadges = (roles: string[]) => {
    return roles.map((role) => (
      <Badge key={role} variant="outline" className="mr-1">
        {role}
      </Badge>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full">
          <div className="flex w-full items-center gap-2">
            <Eye className="size-4" />
            Detail
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>View user information and data.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6">
          {/* Basic Information */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">Basic information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">ID</h4>
                <p className="text-muted-foreground text-sm">{user.id}</p>
              </div>
              <div>
                <h4 className="font-medium">Created at</h4>
                <p className="text-muted-foreground text-sm">
                  {getDisplayDateTime(user.createdAt)}
                </p>
              </div>
              <div>
                <h4 className="font-medium">Updated at</h4>
                <p className="text-muted-foreground text-sm">
                  {getDisplayDateTime(user.updatedAt)}
                </p>
              </div>
              <div>
                <h4 className="font-medium">Status</h4>
                <div className="mt-1">{getStatusBadge(user.status)}</div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">Personal information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">First name</h4>
                <p className="text-muted-foreground text-sm">
                  {user.firstName || "-"}
                </p>
              </div>
              <div>
                <h4 className="font-medium">Last name</h4>
                <p className="text-muted-foreground text-sm">
                  {user.lastName || "-"}
                </p>
              </div>
              <div>
                <h4 className="font-medium">Email</h4>
                <p className="text-muted-foreground text-sm">
                  {user.email || "-"}
                </p>
              </div>
              <div>
                <h4 className="font-medium">Roles</h4>
                <div className="mt-1">{getRoleBadges(user.roles)}</div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">Account information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Email verified</h4>
                <p className="text-muted-foreground text-sm">
                  {user.emailVerified ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <h4 className="font-medium">Image</h4>
                <p className="text-muted-foreground text-sm">
                  {user.image || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
