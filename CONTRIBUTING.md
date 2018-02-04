## Contributing Issues

#### Bug Reports
Please provide a (**simple**) way to reproduce the problem.
A bug that can not be reproduced is less likely be solved.


#### Feature Requests
Please also include the reasoning for the desired feature and not just its description.
Sometimes it is obvious, but other times a few sample use cases or an explanation
can come in handy.


## Contributing bug fixes and new features.

Code contributions are **greatly welcome** and **appreciated**.

Before creating a pull request for larger features please open a related issue
to enable a discussion and ensure alignment with the goals of this project.


## Development Environment

webide-client-tools uses npm tasks for the development flows.
Examine the [package.json][./package] scripts for all the available tasks:


#### Initial Setup

* ```npm install```


#### Type Checking, Code Formatting & Linting

Type checks are done by [combining TypeScript interfaces and JSDocs annotations](https://github.com/bd82/typescript_for_public_apis).
```npm run type_check```

webide-client-tools uses **prettier** to avoid caring about code formatting...
To format your new code use:
```npm run format```

For ease of use see prettier's [editor integrations](https://prettier.io/docs/en/editors.html)

Linting is done using ESLint.
```npm run lint```

** TBD - update npm scripts once external CI is active**


#### Testing

webide-client-tools uses several different types of tests to promote high quality.

The most basic ones are the **jest unit tests**, which are also the most relevant ones.
* ```npm run test```
 
Additionally **integration tests** are used to test webide-client-tools as an end user with the help of **npm link**  
* ```npm run test_examples```


#### Running the central CI flow locally.

**TBD** - create full flow once external CI is created on circle-ci.


#### Legal

All Contributors must sign the [CLA][cla].
The process is completely automated using https://cla-assistant.io/
simply follow the instructions in the pull request.

[cla]: https://cla-assistant.io/SAP/webide-client-tools

