
'use client';

import { roles } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import * as React from "react";

export default function ChooseRolePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline">Choose Your Role in the Ecosystem</h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground">
          To get started, please select the role that best describes you. This will help us tailor your experience and connect you with the right opportunities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Link key={role.id} href={`/join?role=${role.id}`} className="group block h-full">
              <Card className="flex flex-col text-center items-center p-6 h-full transition-all border-2 border-transparent group-hover:border-primary group-hover:shadow-lg">
                <CardHeader className="p-0">
                  <div className="bg-primary/10 p-4 rounded-full mb-4 mx-auto">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>{role.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow p-0 mt-2">
                  <p className="text-muted-foreground">{role.description}</p>
                </CardContent>
                <div className="mt-6 text-primary font-semibold flex items-center justify-center">
                    Select Role <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
