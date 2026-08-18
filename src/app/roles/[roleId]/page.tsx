
'use client'

import { useMemo } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { roles } from '@/lib/roles';
import { useUser } from '@/firebase';
import * as React from 'react';

export default function RolePage({ params }: { params: { roleId: string } }) {
  const { user } = useUser();
  
  const role = useMemo(() => {
    return roles.find(r => r.id === params.roleId);
  }, [params.roleId]);

  if (!role) {
    notFound();
  }

  const { icon: Icon, title, longDescription, image, id: roleId } = role;
  const ctaLink = user ? '/account' : `/join?role=${roleId}`;

  return (
    <div>
      <section className="relative w-full h-64 md:h-80 bg-card">
        {image && (
          <Image
            src={image.imageUrl}
            alt={title}
            fill
            className="object-cover"
            priority
            data-ai-hint={image.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground z-10 p-4">
          <div className="bg-background/20 backdrop-blur-sm p-4 rounded-full mb-4 border border-white/20">
             {Icon && <Icon className="h-12 w-12 text-white" />}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline">Become a {title}</h1>
          <p className="mt-4 text-lg md:text-xl max-w-3xl">Join the TransConnect ecosystem as a valued {title.slice(0, -1)}.</p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
            <Card className="shadow-lg">
                <CardHeader>
                    <h2 className="text-2xl md:text-3xl font-bold font-headline">Your Role in the Ecosystem</h2>
                </CardHeader>
                <CardContent>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        {longDescription}
                    </p>
                    <div className="text-center pt-8 mt-8 border-t">
                        <Button asChild size="lg">
                            <Link href={ctaLink}>
                                {user ? `Go to Your Dashboard` : `Join as a ${title.slice(0, -1)}`}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      </section>
    </div>
  );
}
