// This file should be under sane-tests to be recognized as an example
var exampleServiceDoc = {
  //EXAMPLE_START:serviceExample:configurationProperty:arrayConfigurationProperty
  "serviceExample:arrayConfigurationProperty": [
    {
      name: "configuredName",
      service: {
        implements: "sap.watt.common.service.ide.AbstractUIPartToggler",
        module: "sap.watt.common.perspective/command/AbstractUIPartToggler",
        configuration: {
          id: "commandExample",
          service: "@serviceExample",
          perspective: "development"
        }
      },
      label: "{i18n>serviceExampleLabel}"
    }
  ]
  // EXAMPLE_END
}
