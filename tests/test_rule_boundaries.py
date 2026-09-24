"""Offline boundary checks; verify real rule hits in Surge after deployment."""

import ipaddress
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1] / "surge"


def rules(path):
    return [
        line.split("//", 1)[0].strip()
        for line in (ROOT / path).read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith(("#", "//"))
    ]


def domain_matches(lines, domain):
    return any(
        (kind == "DOMAIN" and domain == value)
        or (kind == "DOMAIN-SUFFIX" and (domain == value or domain.endswith("." + value)))
        for kind, value, *_ in (line.split(",") for line in lines)
    )


def ip_matches(lines, address):
    return any(
        ipaddress.ip_address(address) in ipaddress.ip_network(line.split(",")[1], strict=True)
        for line in lines
        if line.startswith("IP-CIDR,")
    )


class RuleBoundaries(unittest.TestCase):
    def test_amazon_domain_boundary(self):
        lines = rules("region/us.list")
        self.assertTrue(domain_matches(lines, "www.amazon.com"))
        self.assertFalse(domain_matches(lines, "amazon.com.example"))

    def test_company_lists_keep_policy_exceptions_separate(self):
        business = rules("ccxi/ccxi.list")
        direct = rules("ccxi/ccxi-direct.list")
        self.assertEqual(direct, ["DOMAIN,mail.ccxi.com.cn"])
        self.assertTrue(domain_matches(business, "mail.ccxi.com.cn"))
        self.assertTrue(domain_matches(business, "portal.ccxgroup.com.cn"))
        self.assertEqual(sum(line.startswith("AND,((IP-CIDR,") for line in business), 6)
        self.assertEqual(sum(line.startswith("IP-CIDR,") for line in business), 1)
        self.assertFalse((ROOT / "ccxi/ccxi-vpn.list").exists())

    def test_game_rules_do_not_capture_neighboring_addresses_or_keywords(self):
        wot = rules("games/wot.list")
        self.assertTrue(ip_matches(wot, "13.213.231.175"))
        self.assertFalse(ip_matches(wot, "13.213.0.1"))
        self.assertFalse(any("DOMAIN-KEYWORD" in line or "\u00a0" in line for line in wot))
        wotb = rules("games/wotb.list")
        self.assertFalse(ip_matches(wotb, "92.223.16.1"))
        self.assertFalse(any(line.startswith("DOMAIN-KEYWORD,") for line in wotb))
        self.assertTrue(domain_matches(wotb, "asia.wotblitz.com"))
        self.assertFalse(domain_matches(wotb, "notwotb.example"))

    def test_xbox_does_not_capture_office_or_authentication(self):
        lines = rules("games/xbox-cloud-gaming.list")
        self.assertTrue(domain_matches(lines, "www.xbox.com"))
        for domain in ("learn.microsoft.com", "officeclient.microsoft.com", "login.microsoftonline.com"):
            self.assertFalse(domain_matches(lines, domain))


if __name__ == "__main__":
    unittest.main()
