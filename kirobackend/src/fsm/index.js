/**
 * Finite State Machine (FSM) Module
 * 
 * Mengatur transisi status yang valid untuk setiap entitas dalam sistem.
 * Setiap state hanya bisa berpindah ke state tertentu melalui event/action yang valid.
 */

/**
 * FSM untuk Purchase Order
 * 
 * States: PENDING, APPROVED, SHIPPING, COMPLETED, CANCELLED
 * 
 * Diagram:
 *   PENDING ──[approve]──► APPROVED ──[ship]──► SHIPPING ──[complete]──► COMPLETED
 *      │                       │
 *      └──[cancel]──► CANCELLED ◄──[cancel]──┘
 */
const purchaseOrderFSM = {
  initialState: 'PENDING',
  states: {
    PENDING: {
      transitions: {
        approve: 'APPROVED',
        cancel: 'CANCELLED',
      },
    },
    APPROVED: {
      transitions: {
        ship: 'SHIPPING',
        cancel: 'CANCELLED',
      },
    },
    SHIPPING: {
      transitions: {
        complete: 'COMPLETED',
      },
    },
    COMPLETED: {
      transitions: {}, // Final state
    },
    CANCELLED: {
      transitions: {}, // Final state
    },
  },
};

/**
 * FSM untuk Incoming Items (Penerimaan Barang)
 * 
 * States: PENDING, IN_PROGRESS, COMPLETED
 * 
 * Diagram:
 *   PENDING ──[process]──► IN_PROGRESS ──[complete]──► COMPLETED
 *      │                                                    ▲
 *      └────────────────[complete]──────────────────────────┘
 */
const incomingItemFSM = {
  initialState: 'pending',
  states: {
    pending: {
      transitions: {
        process: 'in_progress',
        complete: 'completed',
      },
    },
    in_progress: {
      transitions: {
        complete: 'completed',
      },
    },
    completed: {
      transitions: {}, // Final state
    },
  },
};

/**
 * FSM untuk Product Stock Status
 * 
 * States: NORMAL, LOW, CRITICAL, OUT_OF_STOCK
 * Transisi otomatis berdasarkan perbandingan stock vs minStock
 * 
 * Diagram:
 *   NORMAL ◄──[restock]──► LOW ◄──[restock/sell]──► CRITICAL ◄──[sell]──► OUT_OF_STOCK
 */
const productStockFSM = {
  states: {
    NORMAL: {
      transitions: {
        stock_decrease: ['LOW', 'CRITICAL', 'OUT_OF_STOCK'],
      },
    },
    LOW: {
      transitions: {
        stock_decrease: ['CRITICAL', 'OUT_OF_STOCK'],
        stock_increase: ['NORMAL'],
      },
    },
    CRITICAL: {
      transitions: {
        stock_decrease: ['OUT_OF_STOCK'],
        stock_increase: ['LOW', 'NORMAL'],
      },
    },
    OUT_OF_STOCK: {
      transitions: {
        stock_increase: ['CRITICAL', 'LOW', 'NORMAL'],
      },
    },
  },
  // Hitung state berdasarkan stock dan minStock
  computeState: (stock, minStock) => {
    if (stock <= 0) return 'OUT_OF_STOCK';
    if (stock <= minStock * 0.25) return 'CRITICAL';
    if (stock <= minStock) return 'LOW';
    return 'NORMAL';
  },
};

/**
 * Validate transition - cek apakah transisi dari currentState via event valid
 * @param {object} fsm - FSM definition
 * @param {string} currentState - State saat ini
 * @param {string} event - Event/action yang ingin dilakukan
 * @returns {{ valid: boolean, nextState: string|null, message: string }}
 */
const validateTransition = (fsm, currentState, event) => {
  const stateConfig = fsm.states[currentState];

  if (!stateConfig) {
    return { valid: false, nextState: null, message: `State "${currentState}" tidak valid` };
  }

  const nextState = stateConfig.transitions[event];

  if (!nextState) {
    const availableEvents = Object.keys(stateConfig.transitions);
    if (availableEvents.length === 0) {
      return {
        valid: false,
        nextState: null,
        message: `Status "${currentState}" adalah final state, tidak bisa diubah lagi`,
      };
    }
    return {
      valid: false,
      nextState: null,
      message: `Aksi "${event}" tidak valid dari status "${currentState}". Aksi yang tersedia: ${availableEvents.join(', ')}`,
    };
  }

  return { valid: true, nextState, message: 'OK' };
};

/**
 * Get available events from current state
 * @param {object} fsm - FSM definition
 * @param {string} currentState - State saat ini
 * @returns {string[]} - List event yang tersedia
 */
const getAvailableEvents = (fsm, currentState) => {
  const stateConfig = fsm.states[currentState];
  if (!stateConfig) return [];
  return Object.keys(stateConfig.transitions);
};

/**
 * Get next possible states from current state
 * @param {object} fsm - FSM definition
 * @param {string} currentState - State saat ini
 * @returns {string[]} - List state yang bisa dituju
 */
const getNextStates = (fsm, currentState) => {
  const stateConfig = fsm.states[currentState];
  if (!stateConfig) return [];
  return Object.values(stateConfig.transitions);
};

module.exports = {
  purchaseOrderFSM,
  incomingItemFSM,
  productStockFSM,
  validateTransition,
  getAvailableEvents,
  getNextStates,
};
