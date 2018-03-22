// THIS file is IGNORED from coverage perspective
// because it can't be easily tested using unit tests.

const url = require("url")
const proxy = require("http-proxy-middleware")
const _ = require("lodash")
const execSync = require("child_process").execSync
const which = require("which")

/**
 * middleware
 * @namespace
 */
const middleware = {
    /**
     * Will return the default middleware required to run webide locally on a connect webserver.
     *
     * This means redirects for env.json files with "local" configurations
     * and reverse proxies for DI.
     *
     * @param [options]
     *
     *   @param {number} [options.port = 8888] - Port to use for di reverse proxy.
     *   @param {string} [options.context] - @link {https://github.com/chimurai/http-proxy-middleware#context-matching}.
     *
     *
     *  @return {any}
     */
    getDiProxyMiddleware: function getDiProxyMiddleware(options) {
        const actualOptions = _.defaults(options, {
            port: 8888,
            context: undefined
        })

        const proxyOpts = {
            target: `http://localhost:${actualOptions.port}`,
            changeOrigin: true,
            secure: false,
            /* istanbul ignore next - can only be tested in the context of integration tests */
            onProxyReq: function setBasicAuthentications(proxyReq, req) {
                const urlParts = url.parse(req.headers.referer, true)
                const auth = `Basic ${new Buffer(
                    // @ts-ignore
                    `${urlParts.query.username}:${urlParts.query.password}`
                ).toString("base64")}`
                proxyReq.setHeader("Authorization", auth)
            }
        }

        if (actualOptions.context) {
            return proxy(actualOptions.context, proxyOpts)
        }
        return proxy(proxyOpts)
    },

    /**
	 * Attempts to retrieve IP address of the minikube VM if no IP is predefined
	 * @param {string} [ip] - The VM IP, without any protocol or port
	 * @returns {object}
	 */
    getMinikubeMiddleware: function getMinikubeMiddleware(ip) {
        try {
            const resolved = which.sync("minikube")
            let minikube =
                ip ||
                "http://" +
                    execSync(resolved + " ip")
                        .toString()
                        .trim()
            return proxy("/che6", {
                target: minikube,
                pathRewrite: { "^/che6/(.*)$": "/$1" }
            })
        } catch (oError) {
            console.warn("minikube not found. No middleware to add")
            return {}
        }
    }
}

module.exports = middleware
