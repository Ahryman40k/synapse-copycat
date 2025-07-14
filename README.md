# Synapse: the linux copycat

This project uses Nx as monorepository. It will be helpful to setup:
- workspace tools
- manage additional Angular libraries
- upgrade the project tooling

The selected tools for this project are:
- Angular framework for the frontend
- Storybook for components development and testing
- vitepress for technical documentation
- vitest for unit testing
- playwright for e2e testing
- Github actions as CI
- biome for formatting
- Runtime type checking: Valibot
- state management: ngrx

Frontend component construction is achieved with [Atomic Design](https://img.storyblok.com/0P7BuKmoYLfS60wwpEBiEy3DzP8=/1600x0/f/88751/1958x1180/1b044ea27a/atomic-design-for-partners-graphic.jpg) method.
[extra Ressoures](https://www.aubergine.co/insights/how-to-use-angular-and-atomic-design-to-create-web-applications-a-guide-for-new-developers)
Of course we need to be SOLID and DRY.

## What a modern Angular application should contain

### 1. An external static configuration.

We always have something to configure at startup. At least the backend configuration is a static information that won't change when the application is deployed.
The configuration can come from a server, a static files from your repository or a file added by your Continuous Deployment tools. It will constraint your application behaviour.

### 2. Runtime type checking. 
Any external objects that is related to a described project type should be validated at runtime.ex:
 - Json configuration file
 - web services objects 
 - any external information
Why? Because in Typescript, the Type isn't safely described and at runtime, the received object can be very different from the described type. A solution to avoid that kind of issue and not spending hours debugging your project is to always validate external objects.
A lot of solutions exists, but I choose valibot for the frontend

### 3. A state management 

State management pattern prevents having decorellated states that aren't reproductible


## Finish your CI setup

[Click here to finish setting up your workspace!](https://cloud.nx.app/connect/4bKnu3VmCB)


## Run tasks

To run the dev server for your app, use:

```sh
npx nx serve synapse
```

To create a production bundle:

```sh
npx nx build synapse
```

To see all available targets to run for a project, run:

```sh
npx nx show project synapse
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
