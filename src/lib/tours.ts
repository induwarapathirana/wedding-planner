import { DriveStep } from "driver.js";

// Helper to standard popover style if needed, but driver.js default is fine.

export const BUDGET_STEPS: DriveStep[] = [
    {
        element: '#tour-budget-summary',
        popover: {
            title: 'Budget Overview',
            description: 'Track your total budget, verified spend, and remaining amount at a glance.'
        }
    },
    {
        element: '#tour-add-item',
        popover: {
            title: 'Add New Expenses',
            description: 'Click here to add new items to your budget.'
        }
    },
    {
        element: '#tour-budget-list',
        popover: {
            title: 'Manage Expenses',
            description: 'View your expenses here. Click ANY row or card to EDIT the details.'
        }
    },
    {
        element: '#tour-status-filter',
        popover: {
            title: 'Filter & Sort',
            description: 'Use categories and status to organize your budget.'
        }
    }
];

export const VENDOR_STEPS: DriveStep[] = [
    {
        element: '#tour-vendor-tabs',
        popover: {
            title: 'Vendor Management',
            description: 'Switch between your "My Vendors" (hired/active) and the Master Directory.'
        }
    },
    {
        element: '#tour-add-vendor',
        popover: {
            title: 'Add Vendor',
            description: 'Manually add a vendor to your team.'
        }
    },
    {
        element: '#tour-vendor-list',
        popover: {
            title: 'Vendor Details',
            description: 'Click on any vendor card to edit details, manage payments, or update status.'
        }
    }
];

export const INVENTORY_STEPS: DriveStep[] = [
    {
        element: '#tour-inventory-stats',
        popover: {
            title: 'Inventory Stats',
            description: 'See total items, value, and packing status.'
        }
    },
    {
        element: '#tour-add-inventory',
        popover: {
            title: 'Add Item',
            description: 'Track decor, gifts, and supplies.'
        }
    },
    {
        element: '#tour-inventory-list',
        popover: {
            title: 'Edit & Track',
            description: 'Click any row to edit. Use the checkbox to mark items as "Packed" or "Ready".'
        }
    }
];

export const ITINERARY_STEPS: DriveStep[] = [
    {
        element: '#tour-add-event',
        popover: {
            title: 'Plan Your Day',
            description: 'Add events to your wedding day timeline.'
        }
    },
    {
        element: '#tour-timeline',
        popover: {
            title: 'Timeline View',
            description: 'Events are ordered automatically. Click any event to edit details.'
        }
    },
    {
        element: '#tour-bulk-actions',
        popover: {
            title: 'Bulk Actions',
            description: 'Select multiple events (using checkboxes) to delete them at once.'
        }
    }
];

export const CHECKLIST_STEPS: DriveStep[] = [
    {
        element: '#tour-mode-toggle',
        popover: {
            title: 'View Modes',
            description: 'Switch between "Simple" (To-Do list) and "Timeline" (Month-by-Month) views.'
        }
    },
    {
        element: '#tour-add-task',
        popover: {
            title: 'Add Task',
            description: 'Create custom tasks for your planning journey.'
        }
    },
    {
        element: '#tour-checklist-list',
        popover: {
            title: 'Manage Tasks',
            description: 'Click a task to edit. Click the checkbox to mark as complete.'
        }
    }
];
