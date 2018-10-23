define(["sap.watt.common.platform/service/ui/AbstractPart"], function(
  AbstractPart
) {
  "use strict"

  /**
   * The <i>ServiceExample</i> service is an example service that shows how to use JSDoc to generate documentation for
   * services.
   * It has configuration properties and events, and extends an existing class (module).
   * You can configure <i>serviceExample</i> and listen to its events from other plugins, and use its events from other
   * services.
   * @public
   * @class
   * @service
   * @alias serviceExample
   * @component SAP-WDE-EXAMPLE
   */
  var ServiceExample = AbstractPart.extend(
    "ServiceExample",
    /** @lends sap.watt.common.platform/service/ui/AbstractPart */ {
      /** @type string */
      _sStringValue: undefined,
      /** @type ServiceExampleConfiguration[] */
      _aParams: [],

      /**
       * Method which extends the object
       * @public
       * @memberOf serviceExample
       *
       */
      publicMethod: function() {},

      /**
       * @typedef {Object} ServiceExampleConfiguration
       * @property {string} name - The name
       * @property {Object} service - A custom service
       * @property {string} label - The label, can be an i18n string
       *
       */
      /**
       * @public
       * @memberOf serviceExample
       * @param {object} mConfig
       * @param {ServiceExampleConfiguration[]} mConfig.arrayConfigurationProperty - A configuration property of type array with some internal properties
       * @param {string} mConfig.arrayConfigurationProperty.name - The name
       * @param {Object} mConfig.arrayConfigurationProperty.service - A custom service
       * @param {string} mConfig.arrayConfigurationProperty.label - The label, can be an i18n string
       */
      configure: function(mConfig) {
        this._aParams = mConfig.arrayConfigurationProperty
      },

      /** Executes some logic according to the sent flag.
       * @public
       * @memberOf serviceExample
       * @fires serviceExample#_serviceMethodCalled
       * @param {boolean} bFlag - The flag that decides part of the logic
       * @returns {Promise.<void>} Promise that is resolved when the logic is done executing
       */
      serviceMethod: function(bFlag) {},

      /** Returns a value
       * @public
       * @memberOf serviceExample
       * @returns {Promise.<ServiceExampleConfiguration[]>} The value which is returned
       */
      getValue: function() {
        this._doNotUse()
        return Q(this._aParams)
      },

      // Events
      /**
       * onStringChanged event
       * @event serviceExample#onStringChanged
       * @public
       * @memberOf serviceExample
       * @type {object}
       * @property {string} oldString - The previous value of the string
       * @property {string} newString - The new value of the string
       */

      /**
       * @event serviceExample#_serviceMethodCalled
       * @private
       * @memberOf serviceExample
       * @type {object}
       * @property {string} value - The value during the call
       */

      /**
       * Changes the string value
       * @public
       * @memberOf serviceExample
       * @fires serviceExample#onStringChanged
       * @param {string} sNewValue
       */
      setStringValue: function(sNewValue) {
        var oldValue = this._sStringValue
        this._sStringValue = sNewValue
        this.context.event.fireOnStringChanged({
          oldString: oldValue,
          newString: sNewValue
        })
      },

      /**
       * @listens serviceExample#_serviceMethodCalled
       * @param oEvent
       * @private
       * @memberOf serviceExample
       */
      _onPrivateEventCalled: function(oEvent) {},

      /**
       * This method should not be exposed
       * @private
       * @memberOf serviceExample
       */
      _doNotUse: function() {}
    }
  )

  return ServiceExample
})
