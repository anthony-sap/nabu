import React from "react";
import { useRouter } from "next/navigation";
import { SidebarNavItem } from "@/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SearchCommand } from "../search-command";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

const mockLinks: SidebarNavItem[] = [
  {
    title: "Dashboard",
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: "dashboard",
      },
      {
        title: "Analytics",
        href: "/dashboard/analytics",
        icon: "lineChart",
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        title: "Profile",
        href: "/settings/profile",
        icon: "user",
      },
    ],
  },
];

describe("SearchCommand", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
  });

  it("should render search button with keyboard shortcut", () => {
    render(<SearchCommand links={mockLinks} />);

    expect(
      screen.getByRole("button", { name: /search things/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("should open command dialog when search button is clicked", () => {
    render(<SearchCommand links={mockLinks} />);

    const searchButton = screen.getByRole("button", { name: /search things/i });
    fireEvent.click(searchButton);

    expect(
      screen.getByPlaceholderText("Type a command or search..."),
    ).toBeInTheDocument();
  });

  it("should display all navigation items in command dialog", () => {
    render(<SearchCommand links={mockLinks} />);

    const searchButton = screen.getByRole("button", { name: /search things/i });
    fireEvent.click(searchButton);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("should navigate to selected item when clicked", () => {
    render(<SearchCommand links={mockLinks} />);

    const searchButton = screen.getByRole("button", { name: /search things/i });
    fireEvent.click(searchButton);

    const overviewItem = screen.getByText("Overview");
    fireEvent.click(overviewItem);

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("should close dialog after navigation", async () => {
    render(<SearchCommand links={mockLinks} />);

    const searchButton = screen.getByRole("button", { name: /search things/i });
    fireEvent.click(searchButton);

    const overviewItem = screen.getByText("Overview");
    fireEvent.click(overviewItem);

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("Type a command or search..."),
      ).not.toBeInTheDocument();
    });
  });

  it("should handle keyboard shortcut to open dialog", () => {
    render(<SearchCommand links={mockLinks} />);

    fireEvent.keyDown(document, { key: "k", metaKey: true });

    expect(
      screen.getByPlaceholderText("Type a command or search..."),
    ).toBeInTheDocument();
  });

  it("should handle keyboard shortcut to close dialog", () => {
    render(<SearchCommand links={mockLinks} />);

    const searchButton = screen.getByRole("button", { name: /search things/i });
    fireEvent.click(searchButton);

    fireEvent.keyDown(document, { key: "k", metaKey: true });

    expect(
      screen.queryByPlaceholderText("Type a command or search..."),
    ).not.toBeInTheDocument();
  });

  it("should show no results message when no items match", () => {
    render(<SearchCommand links={mockLinks} />);

    const searchButton = screen.getByRole("button", { name: /search things/i });
    fireEvent.click(searchButton);

    const input = screen.getByPlaceholderText("Type a command or search...");
    fireEvent.change(input, { target: { value: "nonexistent" } });

    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });
});
