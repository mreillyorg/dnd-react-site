# Implementation Plan: Magic Items Tracker

## Overview

Implement item inventory management including assignment, attunement (max 3), consumable tracking, weight/encumbrance, and custom item creation. All tests required with 80% minimum coverage.

---

## Tasks

- [ ] 1. Implement item calculation service
  - [ ] 1.1 Create `src/services/itemService.ts`
    - Implement `calculateCarryingCapacity(strengthScore)`: strength * 15
    - Implement `calculateTotalWeight(assignments)`: sum of weight * quantity
    - Implement `canAttune(currentAttuned)`: check < 3
    - Implement `isEncumbered(totalWeight, capacity)`: weight > capacity
    - Implement `validateQuantity(quantity)`: >= 0, integer
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 Write unit tests for item service (**REQUIRED**)
    - **Test calculateCarryingCapacity**: str 10 → 150, str 20 → 300
    - **Test calculateTotalWeight**: multiple items, varying quantities
    - **Test calculateTotalWeight empty**: returns 0
    - **Test canAttune at 0**: returns true
    - **Test canAttune at 2**: returns true
    - **Test canAttune at 3**: returns false
    - **Test isEncumbered under**: returns false
    - **Test isEncumbered over**: returns true
    - **Test isEncumbered equal**: returns false (at capacity is fine)
    - **Test validateQuantity valid**: positive integers pass
    - **Test validateQuantity invalid**: negatives, decimals rejected
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 2. Implement item assignment GraphQL mutations
  - [ ] 2.1 Create item GraphQL schema
    - Implement `assignItemToCharacter`: create assignment, validate character ownership
    - Implement `removeItemAssignment`: delete assignment, ownership check
    - Implement `updateQuantity`: validate >= 0, ownership check
    - Implement `toggleEquipped`: flip equipped flag
    - Implement `toggleAttuned`: check attunement limit (max 3), verify item requires attunement
    - Implement `characterInventory` query: return assignments with item data
    - _Requirements: 2.1, 2.2_
  - [ ] 2.2 Write mutation tests (**REQUIRED**)
    - **Test assignItemToCharacter**: assignment created
    - **Test assignItemToCharacter non-owner**: FORBIDDEN
    - **Test removeItemAssignment**: deleted
    - **Test updateQuantity valid**: quantity updated
    - **Test updateQuantity to 0**: allowed (depleted)
    - **Test updateQuantity negative**: rejected
    - **Test toggleEquipped**: flips correctly
    - **Test toggleAttuned success**: attuned when < 3
    - **Test toggleAttuned at limit**: rejected when already 3 attuned
    - **Test toggleAttuned item doesn't require**: rejected
    - **Test characterInventory**: returns all items for character
    - **Test auth required on all mutations**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 3. Implement custom item CRUD
  - [ ] 3.1 Create custom item mutations
    - Implement `createCustomItem`: validate input, set source to HOMEBREW
    - Implement `updateCustomItem`: owner only
    - Implement `deleteCustomItem`: owner only
    - Implement `myItemLibrary` query: user's custom items
    - Implement `itemDatabase` query: SRD items with filtering
    - _Requirements: 3.1, 3.2_
  - [ ] 3.2 Write custom item tests (**REQUIRED**)
    - **Test createCustomItem**: item created with HOMEBREW source
    - **Test createCustomItem validation**: required fields
    - **Test updateCustomItem as owner**: updated
    - **Test updateCustomItem as non-owner**: FORBIDDEN
    - **Test deleteCustomItem**: deleted
    - **Test myItemLibrary**: returns user's items only
    - **Test itemDatabase filtering**: by type, rarity
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 4. Checkpoint — Backend complete
  - **GATE: All backend tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing tests**

- [ ] 5. Implement InventoryList and AttunementSlots components
  - [ ] 5.1 Create inventory UI components
    - `InventoryList`: display items with name, type, rarity, quantity, equipped, attuned
    - `AttunementSlots`: visual 3-slot display with attuned items
    - Filter by type, rarity, equipped status
    - Sort by name, type, rarity
    - Show total weight and carrying capacity
    - _Requirements: 4.1_
  - [ ] 5.2 Write component tests (**REQUIRED**)
    - **Test InventoryList renders items**
    - **Test InventoryList filters work**
    - **Test InventoryList sorting**
    - **Test AttunementSlots display**: filled and empty slots
    - **Test weight/capacity display**
    - **Test encumbrance warning**
    - **Test empty inventory state**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 6. Implement ItemCard and item controls
  - [ ] 6.1 Create item interaction components
    - `ItemCard`: name, description, rarity badge, controls
    - Quantity increment/decrement buttons
    - Equip/attune toggle buttons
    - Remove button with confirmation
    - _Requirements: 4.2_
  - [ ] 6.2 Write component tests (**REQUIRED**)
    - **Test ItemCard rendering**: all fields displayed
    - **Test quantity buttons**: increment/decrement calls mutation
    - **Test equip toggle**: calls toggleEquipped
    - **Test attune toggle**: calls toggleAttuned
    - **Test attune disabled when at limit**
    - **Test remove with confirmation**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 7. Implement CustomItemForm and ItemLibrary
  - [ ] 7.1 Create item creation/browsing components
    - `CustomItemForm`: create homebrew items with all fields
    - `ItemLibrary`: browse SRD items and custom items
    - Search and filter functionality
    - Add-to-inventory button
    - _Requirements: 4.3_
  - [ ] 7.2 Write component tests (**REQUIRED**)
    - **Test CustomItemForm rendering**
    - **Test form validation**: required fields
    - **Test form submission**: mutation called
    - **Test ItemLibrary search**
    - **Test ItemLibrary filtering**
    - **Test add-to-inventory button**
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage required**

- [ ] 8. Integration testing
  - [ ] 8.1 Write integration tests (**REQUIRED**)
    - **Test full item assignment flow**: browse → assign → appears in inventory
    - **Test attunement limit**: attune 3 items → 4th rejected
    - **Test consumable depletion**: reduce quantity to 0
    - **Test weight tracking**: add items → weight updates → encumbrance triggers
    - **Test custom item lifecycle**: create → assign → remove → delete
    - **All tests must pass before proceeding**
    - **Minimum 80% coverage**

- [ ] 9. Final checkpoint
  - **FINAL GATE: ALL tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - **DO NOT PROCEED without passing all tests**

---

## Notes

- **TESTING IS MANDATORY**: Every task includes required tests.
- **Coverage requirement**: 80% minimum.
- **Attunement**: Max 3 items per D&D 5e rules.
- **Weight**: Carrying capacity = Strength × 15 lbs.
- **Quantities**: Must be >= 0, no fractional for standard items.
