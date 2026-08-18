
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LendingAssumptions from "./lending-assumptions";
import LendingLoanBook from "./loan-book";

export default function FinancialModelContent() {
  return (
    <Tabs defaultValue="assumptions" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
        <TabsTrigger value="loan-book">Loan Book Projection</TabsTrigger>
      </TabsList>
      <TabsContent value="assumptions">
        <LendingAssumptions />
      </TabsContent>
      <TabsContent value="loan-book">
        <LendingLoanBook />
      </TabsContent>
    </Tabs>
  );
}
