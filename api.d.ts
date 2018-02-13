// ----------------------------------------------------------------
// -------------------------- Dev Server --------------------------
// ----------------------------------------------------------------

/**
 *  A configuration of connect middlewares.
 *  Note the <path> property is optional
 *  and that the middleware property may be an array.
 */
import {Server} from "http";

export type MiddlewareOptions = {
    path?: string
    middleware: Function | Array<Function>
}[]

export type DefaultMiddlewareOptions = { diPort?: number }

export interface DevServerAPI {
    /**
     * Will start a static connect web server serving the CWD.
     */
    startConnect: (
        options?: {
            port?: number
            customMiddlewares?: MiddlewareOptions[]
            builtInMiddlewareOpts?: DefaultMiddlewareOptions
        }
    ) => Server

    /**
     * Will return the default middleware required to run webide locally on a connect webserver.
     *
     * This means redirects for env.json files with "local" configurations
     * and reverse proxies for DI.
     */
    getDefaultMiddleware: (
        options?: DefaultMiddlewareOptions
    ) => MiddlewareOptions
}

export declare const devServer: DevServerAPI

// ----------------------------------------------------------------
// -------------------------- Karma -------------------------------
// ----------------------------------------------------------------

export interface KarmaAPI {
    /**
     * Returns the default properties to be used in a WebIDE's karma config.
     * This can be used directly, however @see buildKarmaConfig
     * for a convenience utility to assist building karma configurations.
     *
     * @link http://karma-runner.github.io/1.0/config/configuration-file.html
     * for details.
     */
    defaultProps: () => Object

    /**
     * @param version - UI5 Version.
     * @param baseUrl - URL where UI5 is hosted
     *
     * @returns a full url to "sap-ui-core.js"
     */
    getUi5VersionUrl: (version: string, baseUrl: string) => string
}

export declare const karma: KarmaAPI

// ----------------------------------------------------------------
// -------------------------- Bundling ----------------------------
// ----------------------------------------------------------------

export interface BundlingAPI {
    /**
     * Bundles A WebIDE Feature, This includes JS Sources, i18n and JSON metadata.
     * It does not include bundling of any UI5 resources. Use tools provided by UI5 to bundle those...
     *
     * returns a promise with an object. The object properties:
     *  outDir: output directory containing the bundled files. The output directory's name may not be known
     *          in advance as it may include a timestamp when the caching option is enabled. By exposing the
     *          exact name, custom post processing steps may be more easily implemented by the user.
     *
     */
    bundleFeature: (
        target: string,
        options?: {
            /**
             * Output directory for the bundle.
             * default value is 'dist'.
             */
            outDir?: string

            /**
             *  bundle into 'outDir/[VERSION]_[TIMESTAMP]/' instead of 'outDir/'
             *  and create a wrapper package.json in outDir/package.json to enable caching support.
             *  default value is true.
             */
            enableCaching?: boolean

            /**
             * Should the output directory be cleaned prior to the bundling.
             * This is enabled by default, if you have custom code which creates additional
             * packaged artifacts to this directory, disabling this option should be considered.
             * default value is true
             */
            cleanOutDir?: boolean

            /**
             * SubOptions for the javaScript bundling phase.
             */
            javaScriptOpts?: {
                /**
                 * custom configurations for the require.js optimizer.
                 * @see http://requirejs.org/docs/optimization.html#options for details.
                 */
                optimizeOptions?: Object

                /**
                 *  Will only log validations errors on the bundled artifacts
                 *  Instead of throwing an error (rejecting the promise).
                 *  Should only be enabled if you know what you are doing...
                 *  @link {https://github.com/SAP/webide-client-tools/blob/master/FAQ.md#VALIDATE
                 */
                ignoreValidations?: boolean

                /**
                 * Ignored glob patterns, by default all JS resources (recursively)
                 * in the directory of the plugin.json will be bundled. However,
                 * some special edge cases may require exclusion.
                 * @See https://github.com/isaacs/node-glob
                 * for details on valid patterns syntax.
                 */
                ignore?: string | string[]
            }

            /**
             * SubOptions for the JSON metadata bundling phase.
             */
            metadataOpts?: {
                /**
                 * Prefix to apply to all plugins paths, for example "quickstart" --> "w5g/quickstart"
                 */
                pluginsPrefix?: string
            }
        }
    ) => Promise<{ outDir: string }>

    /**
     * Internal utilities to construct the bundleFeature flow.
     * These are exposed as un-official APIs to enable the creation of advanced flows by end users.
     * However they do receive the same level of support as the true official APIs.
     */
    internal: any
}

export declare const bundling: BundlingAPI

// ----------------------------------------------------------------
// -------------------------- STF ---------------------------------
// ----------------------------------------------------------------

export type PluginDescription = {
    pluginName: string
    sURI: string
    required?: boolean
}

export type PluginsTransformDef = {
    remove?: (string | RegExp)[]
    add?: PluginDescription[]
}

export type MockPresets = "IN_MEMORY_BACKEND"

export type WebIDEServiceProxy = Object

export type AMDModule = Object

export interface STF_API {
    /**
     *
     * @param [options.urlParams] {Object.<string, string>} -
     *                     Additional url params, for example:
     *                     {
     *                     	 user:"TECHNICAL_USER",
     *                       myKey:"myValue"
     *                     }
     *
     *
     * @return {Promise<Window>} For the window in which the WebIde is running.
     *                           This will be resolved when the WebIde core has finished loading (all_plugins_started)
     */
    startWebIDE: (
        /**
         * Unique ID for this webide instance.
         */
        id: string,
        options?: {
            /**
             * A Webide feature config to be used as
             * the root configuration when starting the webide.
             */
            featureConfig?: Object

            /**
             * A Webide env.json object (NOT a url to one).
             */
            env?: Object

            /**
             * Definition of WebIDE plugins transformation which happen BEFORE
             * any plugins are registered in the pluginRegistry. This allows using mock
             * plugins or adding plugins to the WebIDE "instance" started during the tests.
             */
            pluginsTransformDef?: PluginsTransformDef

            /**
             * Common presets for using pluginsTransformDef to mock (replace) WebIDE capabilities.
             * Most commonly used to mock the backend service to allow testing with an "in-memory"
             * fake file system.
             */
            mocks?: MockPresets[]

            /**
             * Default value is: '/base/node_modules/webide/src/main/webapp/index.html'
             */
            html?: string

            /**
             * Path to load ui5 from for this 'instance' of the webIDE.
             */
            ui5Root?: string

            /**
             * Flag to enable/disable the use of 'sap-ui-debug=true' flag in the WebIde's url.
             */
            ui5Debug?: boolean

            /**
             * Flag to enable/disable the use of 'sap-ide-debug=true' flag in the WebIde's url.
             */
            ideDebug?: boolean

            /**
             * Additional url params passed to the webide instance for example:
             *                     {
             *                     	 user: "TECHNICAL_USER",
             *                       myFlag: "myValue"
             *                     }
             */
            urlParams?: { [key: string]: string }
        }
    ) => Promise<void>

    shutdownWebIde(
        /**
         * Id of the webide 'instance' to shutdown.
         */
        id: string
    ): void

    /**
     * Exposes a service from WebIDE 'instance'
     */
    getService(
        /**
         * Id of the webide 'instance' to shutdown.
         */
        id: string,
        serviceName: string
    ): Promise<WebIDEServiceProxy>

    /**
     * Utility to get a partial <getService> function with a bound suiteName argument.
     * This can be used to reduce verbosity and mistakes due to copy paste.
     */
    getServicePartial(
        id: string
    ): (serviceName: string) => Promise<WebIDEServiceProxy>

    /**
     * exposes require.js AMD modules from the WwebIDE's instance's iframe
     */
    require(id: string, depPaths: string[]): Promise<AMDModule>

    /**
     * Exposes the original AMD module of a WebIDE service proxy.
     * This can allow accessing "private" methods on a service.
     */
    getServicePrivateImpl(Service: WebIDEServiceProxy): Promise<AMDModule>
}

export declare const STF: STF_API

export as namespace webideClientTools
