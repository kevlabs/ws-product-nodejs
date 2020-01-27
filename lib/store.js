/* store with auto garbage collection capability
 * implemented using two JS objects, each with a different expiry
 */

module.exports = class Store {
  constructor(lifespanMs) {
    this.lifespanMs = lifespanMs;
    this._reset();
  }

  // PUBLIC API

  has(key) {
    this._checkExpiry();
    return this.nextStore.has(key) || this.currentStore.has(key);
  }

  // returns undefined if key does not exist in either stores
  get(key) {
    this._checkExpiry();
    return this.nextStore.has(key) ? this.nextStore.get(key) : this.currentStore.get(key);
  }

  set(key, value) {
    // determines in which store to save key/value pair
    this._getStore(value).set(key, value);
    return this;
  }

  delete(key) {
    this.currentStore.delete(key) && this.nextStore.delete(key);
    return this;
  }


  // PRIVATE METHODS

  _createStore(expiryMs) {
    return new InnerStore(expiryMs);
  }

  _rollOver() {
    // const [currentStore, nextStore] = [this.nextStore, this._addStore(this.nextStore.expiryMs + this.lifespanMs)];
    const currentStore = this.nextStore;
    const nextStore = this._createStore(currentStore.expiryMs + this.lifespanMs);

    this.currentStore = currentStore;
    this.nextStore = nextStore;

    return this;
  }

  // called at init or if both stores have expired
  _reset() {
    const currentExpiry = Date.now() + this.lifespanMs;
    const nextExpiry = currentExpiry + this.lifespanMs;

    this.currentStore = this._createStore(currentExpiry);
    this.nextStore = this._createStore(nextExpiry);

    return this;
  }

  _checkExpiry() {
    // if both stores have expired, reset otherwise roll over.
    if (this.currentStore.isExpired()) {
      this.nextStore.isExpired() && this._reset() || this._rollOver();
    }
    return this;
  }

  // returns most current store that can accomodate expiry key in value object, or next store if key does not exist
  _getStore(value) {
    return value.expiryMs < this.currentStore.expiryMs ? this.currentStore : this.nextStore;
  }
}

class InnerStore {
  constructor(expiryMs) {
    this._expiryMs = expiryMs;
    this._data = {};
  }

  has(key) {
    return key in this._data;
  }

  get(key) {
    return this._data[key];
  }

  set(key, value) {
    this._data[key] = value;
    return this;
  }

  delete(key) {
    delete this._data[key];
    return this;
  }

  isExpired() {
    return Date.now() >= this._expiryMs;
  }

  get expiryMs() {
    return this._expiryMs;
  }
}