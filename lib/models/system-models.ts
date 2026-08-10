import type { LucideIcon } from 'lucide-react';

export class NavigationItem {
  constructor(
    public readonly label: string,
    public readonly icon: LucideIcon,
    public readonly href: string,
    public readonly badge?: number,
  ) {}
}

export class ConnectedNode {
  constructor(
    public readonly name: string,
    public readonly role: string,
    public readonly status: 'Online' | 'Offline' = 'Online',
  ) {}
}

export class AboutPageInfo {
  constructor(
    public readonly title: string,
    public readonly version: string,
    public readonly description: string,
    public readonly stack: string[],
    public readonly nodes: ConnectedNode[],
  ) {}
}
