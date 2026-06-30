"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function Tabs({ className = "", ...props }) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn("flex flex-col gap-2", className)}
			{...props}
		/>
	);
}

const listStyles = {
	default:
		"bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
	underline:
		"inline-flex h-9 w-fit items-center justify-center gap-1 border-b border-border",
};

function TabsList({ className = "", variant = "default", ...props }) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(listStyles[variant], className)}
			{...props}
		/>
	);
}

const triggerStyles = {
	default:
		"data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	underline:
		"data-[selected]:text-foreground data-[selected]:border-foreground text-muted-foreground inline-flex h-full flex-1 items-center justify-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
};

function TabsTrigger({ className = "", value = "", variant = "default", ...props }) {
	return (
		<TabsPrimitive.Tab
			data-slot="tabs-trigger"
			value={value}
			className={cn(triggerStyles[variant], className)}
			{...props}
		/>
	);
}

function TabsContent({ className = "", ...props }) {
	return (
		<TabsPrimitive.Panel
			data-slot="tabs-content"
			className={cn("flex-1 outline-none", className)}
			{...props}
		/>
	);
}

Tabs.displayName = "Tabs";
TabsList.displayName = "TabsList";
TabsTrigger.displayName = "TabsTrigger";
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
