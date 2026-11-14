"""
Unit tests for Ballistix Numerical Engine solvers.

Run with: python -m pytest api/solvers/test_engine.py -v
"""

import math
import numpy as np
import pytest

from api.solvers.engine import (
    bisection_method,
    false_position_method,
    newton_raphson_method,
    gauss_elimination,
    gauss_jordan,
    euler_method,
    modified_euler_method,
    rk4_projectile,
    knapsack_ordnance_selector,
    batch_bisection,
)


# =============================================================================
# ROOT-FINDING TESTS
# =============================================================================

class TestBisection:
    def test_simple_polynomial(self):
        """Test x^2 - 4 = 0 on [1, 3] -> root 2"""
        f = lambda x: x**2 - 4
        result = bisection_method(f, 1.0, 3.0, tol=1e-10)
        assert result["converged"]
        assert abs(result["root"] - 2.0) < 1e-8

    def test_trigonometric(self):
        """Test sin(x) = 0 on [3, 4] -> root pi"""
        f = lambda x: math.sin(x)
        result = bisection_method(f, 3.0, 4.0, tol=1e-10)
        assert result["converged"]
        assert abs(result["root"] - math.pi) < 1e-8

    def test_exponential(self):
        """Test e^x - 2 = 0 -> root ln(2)"""
        f = lambda x: math.exp(x) - 2
        result = bisection_method(f, 0.0, 1.0, tol=1e-10)
        assert result["converged"]
        assert abs(result["root"] - math.log(2)) < 1e-8

    def test_no_bracket(self):
        """Test error when root not bracketed"""
        f = lambda x: x**2 + 1
        with pytest.raises(ValueError, match="same sign"):
            bisection_method(f, -1.0, 1.0)

    def test_convergence_info(self):
        """Test that iterations and error info are returned"""
        f = lambda x: x**2 - 2
        result = bisection_method(f, 1.0, 2.0, tol=1e-6)
        assert "iterations" in result
        assert "final_error" in result
        assert len(result["iterations"]) > 0


class TestFalsePosition:
    def test_simple_polynomial(self):
        f = lambda x: x**2 - 4
        result = false_position_method(f, 1.0, 3.0, tol=1e-10)
        assert result["converged"]
        assert abs(result["root"] - 2.0) < 1e-8

    def test_no_bracket(self):
        f = lambda x: x**2 + 1
        with pytest.raises(ValueError, match="same sign"):
            false_position_method(f, -1.0, 1.0)


class TestNewtonRaphson:
    def test_simple_polynomial(self):
        f = lambda x: x**2 - 4
        df = lambda x: 2*x
        result = newton_raphson_method(f, df, 3.0, tol=1e-10)
        assert result["converged"]
        assert abs(result["root"] - 2.0) < 1e-8

    def test_cubic(self):
        f = lambda x: x**3 - 2*x - 5
        df = lambda x: 3*x**2 - 2
        result = newton_raphson_method(f, df, 2.0, tol=1e-10)
        assert result["converged"]
        # Root near 2.09455
        assert abs(result["root"] - 2.094551) < 1e-5

    def test_zero_derivative(self):
        f = lambda x: x**2
        df = lambda x: 2*x
        with pytest.raises(ValueError, match="Derivative near zero"):
            newton_raphson_method(f, df, 0.0)


# =============================================================================
# LINEAR ALGEBRA TESTS
# =============================================================================

class TestGaussElimination:
    def test_2x2_system(self):
        A = [[2, 1], [1, -1]]
        b = [3, 0]
        result = gauss_elimination(A, b)
        # Solution: x=1, y=1
        assert abs(result["solution"][0] - 1.0) < 1e-10
        assert abs(result["solution"][1] - 1.0) < 1e-10

    def test_3x3_system(self):
        A = [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]]
        b = [8, -11, -3]
        result = gauss_elimination(A, b)
        # Solution: x=2, y=3, z=-1
        expected = [2.0, 3.0, -1.0]
        for i, val in enumerate(result["solution"]):
            assert abs(val - expected[i]) < 1e-10

    def test_singular_matrix(self):
        A = [[1, 2], [2, 4]]  # Linearly dependent
        b = [3, 6]
        with pytest.raises(ValueError, match="singular"):
            gauss_elimination(A, b)

    def test_determinant(self):
        A = [[2, 1], [1, -1]]
        b = [3, 0]
        result = gauss_elimination(A, b)
        assert abs(result["determinant"] - (-3.0)) < 1e-10


class TestGaussJordan:
    def test_2x2_system(self):
        A = [[2, 1], [1, -1]]
        b = [3, 0]
        result = gauss_jordan(A, b)
        assert abs(result["solution"][0] - 1.0) < 1e-10
        assert abs(result["solution"][1] - 1.0) < 1e-10

    def test_inverse_returned(self):
        A = [[2, 1], [1, -1]]
        b = [3, 0]
        result = gauss_jordan(A, b)
        assert "inverse" in result
        inv = np.array(result["inverse"])
        A_arr = np.array(A)
        # Check A * A_inv = I
        prod = A_arr @ inv
        assert np.allclose(prod, np.eye(2))

    def test_singular_matrix(self):
        A = [[1, 2], [2, 4]]
        b = [3, 6]
        with pytest.raises(ValueError, match="singular"):
            gauss_jordan(A, b)


# =============================================================================
# ODE TESTS
# =============================================================================

class TestEulerMethod:
    def test_exponential_growth(self):
        """dy/dx = y, y(0)=1 -> y(1) = e"""
        f = lambda x, y: y
        result = euler_method(f, 0.0, 1.0, 1.0, 0.001)
        assert abs(result["result"] - math.e) < 0.01  # Euler has error

    def test_linear(self):
        """dy/dx = 2, y(0)=0 -> y(1) = 2"""
        f = lambda x, y: 2.0
        result = euler_method(f, 0.0, 0.0, 1.0, 0.1)
        assert abs(result["result"] - 2.0) < 1e-10

    def test_invalid_step(self):
        f = lambda x, y: y
        with pytest.raises(ValueError, match="positive"):
            euler_method(f, 0.0, 1.0, 1.0, -0.1)

    def test_invalid_target(self):
        f = lambda x, y: y
        with pytest.raises(ValueError, match="greater"):
            euler_method(f, 1.0, 1.0, 0.0, 0.1)


class TestModifiedEulerMethod:
    def test_exponential_growth(self):
        """dy/dx = y, y(0)=1 -> y(1) = e (more accurate than Euler)"""
        f = lambda x, y: y
        result = modified_euler_method(f, 0.0, 1.0, 1.0, 0.01)
        assert abs(result["result"] - math.e) < 0.001  # Better accuracy

    def test_known_solution(self):
        """dy/dx = x + y, y(0)=1 -> exact: y = 2e^x - x - 1"""
        f = lambda x, y: x + y
        result = modified_euler_method(f, 0.0, 1.0, 1.0, 0.001)
        exact = 2*math.e - 1 - 1
        assert abs(result["result"] - exact) < 0.01


# =============================================================================
# BALLISTICS TESTS
# =============================================================================

class TestRK4Projectile:
    def test_no_drag_analytical(self):
        """Compare with analytical solution for no drag"""
        v0 = 50.0
        angle = 45.0
        g = 9.81

        # Analytical range: v0^2 * sin(2*theta) / g
        analytical_range = v0**2 * math.sin(math.radians(90)) / g
        analytical_height = (v0**2 * math.sin(math.radians(45))**2) / (2*g)
        analytical_time = 2 * v0 * math.sin(math.radians(45)) / g

        result = rk4_projectile(v0, angle, g=g, drag_coeff=0.0, dt=0.001)

        assert abs(result["range"] - analytical_range) < 0.5  # Within 0.5m
        assert abs(result["max_height"] - analytical_height) < 0.1
        assert abs(result["flight_time"] - analytical_time) < 0.05

    def test_with_drag_reduces_range(self):
        """Drag should reduce range compared to no drag"""
        v0 = 50.0
        angle = 45.0

        no_drag = rk4_projectile(v0, angle, drag_coeff=0.0, dt=0.001)
        with_drag = rk4_projectile(v0, angle, drag_coeff=0.02, dt=0.001)

        assert with_drag["range"] < no_drag["range"]
        assert with_drag["max_height"] < no_drag["max_height"]
        assert with_drag["flight_time"] < no_drag["flight_time"]

    def test_vertical_shot(self):
        """Straight up: angle=90 (but we limit to <90, so use 89.9)"""
        result = rk4_projectile(20.0, 89.9, drag_coeff=0.0, dt=0.001)
        # Should go up and come down near x=0
        assert result["range"] < 1.0
        assert result["max_height"] > 0

    def test_invalid_inputs(self):
        with pytest.raises(ValueError, match="positive"):
            rk4_projectile(-10, 45)
        with pytest.raises(ValueError, match="Angle"):
            rk4_projectile(10, 0)
        with pytest.raises(ValueError, match="Angle"):
            rk4_projectile(10, 90)
        with pytest.raises(ValueError, match="positive"):
            rk4_projectile(10, 45, mass=-1)


class TestKnapsack:
    def test_simple_case(self):
        weights = [2, 3, 4, 5]
        values = [3, 4, 5, 6]
        capacity = 5

        result = knapsack_ordnance_selector(weights, values, capacity)
        # Optimal: items 0 (w=2,v=3) + 1 (w=3,v=4) = w=5, v=7
        assert result["max_value"] == 7.0
        assert set(result["selected_items"]) == {0, 1}
        assert result["total_weight"] == 5.0

    def test_single_item(self):
        weights = [5.0]
        values = [10.0]
        capacity = 5.0

        result = knapsack_ordnance_selector(weights, values, capacity)
        assert result["max_value"] == 10.0
        assert result["selected_items"] == [0]

    def test_item_too_heavy(self):
        weights = [10.0]
        values = [100.0]
        capacity = 5.0

        result = knapsack_ordnance_selector(weights, values, capacity)
        assert result["max_value"] == 0.0
        assert result["selected_items"] == []

    def test_zero_capacity(self):
        weights = [1, 2]
        values = [10, 20]
        with pytest.raises(ValueError, match="positive"):
            knapsack_ordnance_selector(weights, values, 0)

    def test_empty_items(self):
        result = knapsack_ordnance_selector([], [], 10.0)
        assert result["max_value"] == 0.0
        assert result["selected_items"] == []

    def test_fractional_weights(self):
        weights = [1.5, 2.5, 3.0]
        values = [10.0, 20.0, 15.0]
        capacity = 4.0

        result = knapsack_ordnance_selector(weights, values, capacity)
        # Should handle fractional weights via scaling
        assert result["max_value"] > 0
        assert result["total_weight"] <= capacity + 0.001  # Small rounding


# =============================================================================
# BATCH TESTS
# =============================================================================

class TestBatchBisection:
    def test_multiple_roots(self):
        f = lambda x: x**2 - 4
        f_vec = np.vectorize(f)

        xl = np.array([1.0, 1.0, 1.0])
        xu = np.array([3.0, 5.0, 10.0])

        roots = batch_bisection(f_vec, xl, xu, tol=1e-10)
        expected = np.array([2.0, 2.0, 2.0])
        assert np.allclose(roots, expected)


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

class TestIntegration:
    def test_rk4_trajectory_structure(self):
        """Verify all expected fields in trajectory output"""
        result = rk4_projectile(30.0, 30.0, dt=0.01)

        required_keys = ["trajectory", "max_height", "range", "flight_time",
                         "apex_time", "impact_velocity", "params"]
        for key in required_keys:
            assert key in result

        # Trajectory should have points
        assert len(result["trajectory"]) > 2

        # First point at origin
        assert result["trajectory"][0]["x"] == 0.0
        assert result["trajectory"][0]["y"] == 0.0

        # Last point at y=0 (impact)
        assert result["trajectory"][-1]["y"] == 0.0

        # Params echoed back
        assert result["params"]["v0"] == 30.0
        assert result["params"]["angle"] == 30.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])