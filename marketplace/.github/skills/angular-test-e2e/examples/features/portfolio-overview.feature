@portfolio
Feature: Portfolio Overview
  As a portfolio manager
  I want to view and analyze my positions
  So that I can make informed trading decisions

  Background:
    Given I am logged in as a portfolio manager
    And I navigate to the portfolio page

  @smoke
  Scenario: View portfolio summary
    Then I should see the portfolio value displayed
    And I should see at least 1 position in the table
    And the total P&L should be visible

  Scenario: Filter positions by asset class
    When I select asset class filter "Equities"
    Then all displayed positions should have asset class "Equities"
    And the position count should update

  Scenario: Sort positions by market value
    When I click the "Market Value" column header
    Then positions should be sorted by market value descending
    When I click the "Market Value" column header again
    Then positions should be sorted by market value ascending

  Scenario: Search for a specific holding
    When I enter "AAPL" in the search box
    Then I should see only positions matching "AAPL"
    And the search results count should be displayed

  @regression
  Scenario: Export portfolio to CSV
    When I click the "Export CSV" button
    Then a CSV file should be downloaded
    And the CSV should contain headers "Symbol,Quantity,Price,Market Value,P&L"
    And the CSV row count should match the displayed position count

  Scenario: View position details
    When I click on position "AAPL"
    Then the position detail panel should open
    And I should see the trade history for "AAPL"
    And I should see the current market data for "AAPL"
