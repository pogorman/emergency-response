# Model-Driven Apps — Specification Files

## Overview

This directory contains **JSON specification files** (blueprints) for the EmergencyResponseCoordination model-driven app. These are **not** live Power Apps artifacts — they define the structure and behavior that a maker translates into the Power Apps maker portal.

## Spec Format

All files conform to `_schema/mda-definition-schema.json`. Each spec type documents:

| Spec Type | What It Defines | Maker Portal Location |
|-----------|----------------|-----------------------|
| **App Definition** | App metadata, security roles, features, default dashboard | Apps → New → Model-driven app |
| **Sitemap** | Navigation structure — areas, groups, sub-areas | App Designer → Navigation |
| **Views** | Column layout, filters, sort order for entity lists | Tables → Views |
| **Forms** | Field layout, tabs, sections, subgrids, business rules | Tables → Forms |
| **Dashboards** | Widget layout — lists, charts, streams | Dashboards → New |
| **BPF** | Business process flow stages, fields, gates | Processes → New → Business Process Flow |
| **Command Bar** | Custom buttons on entity command ribbons | App Designer → Command Bar |

## Directory Structure

```
model-driven-apps/
├── _schema/
│   └── mda-definition-schema.json    # JSON Schema for all spec types
├── README.md                          # This file
└── seo_dispatch-console/
    ├── app-definition.json            # App-level config
    ├── sitemap.json                   # 4-area navigation
    ├── views/                         # 13 files (27 views)
    ├── forms/                         # 14 files (19 forms)
    ├── dashboards/                    # 4 dashboard definitions
    ├── business-process-flows/        # 1 BPF (Incident Lifecycle)
    └── command-bar/                   # 1 custom command (Declare MCI)
```

## Translation Guide: Spec → Power Apps Maker Portal

### Views

1. Open the target table in the Power Apps maker portal
2. Navigate to **Views** → **New view**
3. Set the view name to `displayName`
4. Add columns from the `columns` array in the specified order and width
5. Configure filters from the `filter` object using the Advanced Find-style conditions
6. Set sort order from `sortOrder`
7. Save and publish

**Filter operators map:**
| Spec Operator | Maker Portal |
|---------------|-------------|
| `eq` | Equals |
| `ne` | Does Not Equal |
| `gt` | Greater Than |
| `in` | Equals (multi-select) |
| `null` | Does Not Contain Data |
| `not-null` | Contains Data |
| `last-x-days` | Last X Days |

### Forms

1. Open the target table → **Forms** → **New form** (Main or Quick Create)
2. Set the form name to `displayName`
3. For Main forms: create tabs from `layout.tabs`, sections within tabs, then drag fields
4. For Quick Create forms: create sections from `layout.sections`, then drag fields
5. Add subgrids by inserting a **Subgrid** component in the specified section
6. Configure header fields (up to 4) from `header.fields`
7. Apply business rules from the `businessRules` array

**Tab/section layout:** The `columns` property on sections controls the column layout (1, 2, or 3 columns). Fields flow left-to-right, top-to-bottom within the section grid.

### Dashboards

1. **Dashboards** → **New** → select column layout matching `columns`
2. For each widget, add the appropriate component:
   - `List` → Insert a view list, select the specified `entity` and `viewName`
   - `Chart` → Insert a chart, configure `chartType`, `chartGroupBy`, and `chartAggregate`
   - `Stream` → Insert an activity stream or timeline control
3. Position widgets according to `position` (row, column, span)

### Business Process Flows

1. **Processes** → **New** → **Business Process Flow**
2. Set entity to the BPF's `entity`
3. Add stages from the `stages` array in order
4. For each stage, add data steps for each field in `fields`
5. Mark fields as required per `isRequired`
6. Configure stage gates — these are validation rules that must pass before the user can advance to the next stage

### Command Bar

1. Open the app in App Designer → select the entity → **Command Bar**
2. Add a new button with `label` and `icon`
3. Configure **Visibility rules** from the `visibility.rules` array
4. Configure the **Action** — for `SetFieldValue`, the button patches the specified field
5. Add confirmation dialog if `confirmationMessage` is specified

## Column Reference

All column names in views and forms reference the Dataverse logical names defined in `/datamodel/tables/`. Cross-reference with `/docs/TECHNICAL.md` (Data Dictionary section) for column types and descriptions.

## Security Role Filtering

Views, forms, dashboards, and sitemap sub-areas include a `roles` array indicating which security roles should see the artifact. This maps to the **Security Roles** configuration in the Power Apps maker portal where you can restrict form/view visibility by role.
