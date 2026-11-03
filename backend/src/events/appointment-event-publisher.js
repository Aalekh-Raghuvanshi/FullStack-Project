function createAppointmentEventPublisher() {
  const listeners = new Set();

  return {
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Appointment event listener must be a function.');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async publish(event) {
      const immutableEvent = Object.freeze({ ...event });
      return Promise.allSettled([...listeners].map((listener) => Promise.resolve().then(() => listener(immutableEvent))));
    },
  };
}

const appointmentEventPublisher = createAppointmentEventPublisher();

module.exports = { appointmentEventPublisher, createAppointmentEventPublisher };
