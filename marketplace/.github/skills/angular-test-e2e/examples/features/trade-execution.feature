@trading @smoke
Feature: Trade Execution
  As a trader
  I want to execute buy and sell orders
  So that I can manage my portfolio

  Background:
    Given I am logged in as a trader
    And the market is open

  Scenario: Submit a market buy order
    Given I navigate to the trading page
    When I select symbol "AAPL"
    And I enter quantity "100"
    And I select order type "Market"
    And I click "Submit Order"
    Then I should see confirmation "Order submitted"
    And the order should appear in the blotter with status "Pending"

  Scenario: Submit a limit sell order
    Given I navigate to the trading page
    When I select symbol "GOOGL"
    And I enter quantity "50"
    And I select order type "Limit"
    And I enter limit price "2850.00"
    And I select side "Sell"
    And I click "Submit Order"
    Then I should see confirmation "Limit order submitted"
    And the order should appear in the blotter with status "Pending"

  Scenario: Cancel a pending order
    Given I have a pending order for "AAPL"
    When I click cancel on the order
    Then the order status should change to "Cancelled"
    And I should see notification "Order cancelled successfully"

  @regression
  Scenario Outline: Validate order form inputs
    Given I navigate to the trading page
    When I enter quantity "<quantity>"
    Then I should see validation message "<message>"

    Examples:
      | quantity | message                |
      | 0        | Quantity must be > 0   |
      | -5       | Quantity must be > 0   |
      | abc      | Must be a number       |
      | 1000001  | Max quantity exceeded  |
