"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthorizedError = exports.NotImplementedError = exports.InvalidSiweParamsError = exports.FiatAccountSchemaEnum = exports.Countries = exports.ValidationError = exports.EnviromentE = exports.FiatConnectError = exports.CryptoType = exports.FiatAccountType = exports.FiatType = exports.FiatAccountSchema = void 0;
/* eslint-disable max-classes-per-file*/
var fiatconnect_types_1 = require("@fiatconnect/fiatconnect-types");
Object.defineProperty(exports, "FiatAccountSchema", { enumerable: true, get: function () { return fiatconnect_types_1.FiatAccountSchema; } });
Object.defineProperty(exports, "FiatType", { enumerable: true, get: function () { return fiatconnect_types_1.FiatType; } });
Object.defineProperty(exports, "CryptoType", { enumerable: true, get: function () { return fiatconnect_types_1.CryptoType; } });
Object.defineProperty(exports, "FiatAccountType", { enumerable: true, get: function () { return fiatconnect_types_1.FiatAccountType; } });
Object.defineProperty(exports, "FiatConnectError", { enumerable: true, get: function () { return fiatconnect_types_1.FiatConnectError; } });
var EnviromentE;
(function (EnviromentE) {
    EnviromentE[EnviromentE["DEV"] = 0] = "DEV";
    EnviromentE[EnviromentE["LIVE"] = 1] = "LIVE";
})(EnviromentE || (exports.EnviromentE = EnviromentE = {}));
/*
 * API error types
 */
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(msg, validationError, fiatConnectError) {
        var _this = _super.call(this, msg) || this;
        _this.validationError = validationError;
        _this.fiatConnectError = fiatConnectError;
        return _this;
    }
    return ValidationError;
}(Error));
exports.ValidationError = ValidationError;
var Countries;
(function (Countries) {
    Countries["UG"] = "UG";
    Countries["KE"] = "KE";
    Countries["GHA"] = "GHA";
    Countries["TZ"] = "TZ";
    // CMR ="CMR",
    // ZM = "ZM" ZAMBIA
})(Countries || (exports.Countries = Countries = {}));
var FiatAccountSchemaEnum;
(function (FiatAccountSchemaEnum) {
    FiatAccountSchemaEnum[FiatAccountSchemaEnum["AccountNumber"] = 0] = "AccountNumber";
    FiatAccountSchemaEnum[FiatAccountSchemaEnum["MobileMoney"] = 1] = "MobileMoney";
    FiatAccountSchemaEnum[FiatAccountSchemaEnum["DuniaWallet"] = 2] = "DuniaWallet";
    FiatAccountSchemaEnum[FiatAccountSchemaEnum["IBANNumber"] = 3] = "IBANNumber";
    FiatAccountSchemaEnum[FiatAccountSchemaEnum["IFSCAccount"] = 4] = "IFSCAccount";
    FiatAccountSchemaEnum[FiatAccountSchemaEnum["PIXAccount"] = 5] = "PIXAccount";
})(FiatAccountSchemaEnum || (exports.FiatAccountSchemaEnum = FiatAccountSchemaEnum = {}));
var InvalidSiweParamsError = /** @class */ (function (_super) {
    __extends(InvalidSiweParamsError, _super);
    function InvalidSiweParamsError(fiatConnectError, msg) {
        var _this = _super.call(this, msg || fiatConnectError) || this;
        _this.fiatConnectError = fiatConnectError;
        return _this;
    }
    return InvalidSiweParamsError;
}(Error));
exports.InvalidSiweParamsError = InvalidSiweParamsError;
var NotImplementedError = /** @class */ (function (_super) {
    __extends(NotImplementedError, _super);
    function NotImplementedError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return NotImplementedError;
}(Error));
exports.NotImplementedError = NotImplementedError;
var UnauthorizedError = /** @class */ (function (_super) {
    __extends(UnauthorizedError, _super);
    function UnauthorizedError(fiatConnectError, msg) {
        if (fiatConnectError === void 0) { fiatConnectError = fiatconnect_types_1.FiatConnectError.Unauthorized; }
        var _this = _super.call(this, msg || fiatConnectError) || this;
        _this.fiatConnectError = fiatConnectError;
        return _this;
    }
    return UnauthorizedError;
}(Error));
exports.UnauthorizedError = UnauthorizedError;
