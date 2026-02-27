
import { deduplicateRequests, mergeRequest } from '../rideHelpers';
import assert from 'assert';

console.log('Running Ride Helper Tests...');

// Test 1: Deduplication of list
{
    console.log('Test 1: Deduplication of list');
    const input = [
        { id: '1', customerId: 'c1', val: 'old' },
        { id: '2', customerId: 'c2', val: 'c2-val' },
        { id: '3', customerId: 'c1', val: 'new' } // Same customer as c1
    ];
    const output = deduplicateRequests(input);
    
    assert.strictEqual(output.length, 2, 'Should have 2 items');
    const c1 = output.find(x => x.customerId === 'c1');
    assert.strictEqual(c1.val, 'new', 'Should keep the latest request for c1');
    console.log('PASSED');
}

// Test 2: Merge new request
{
    console.log('Test 2: Merge new request');
    const current = [
        { id: '1', customerId: 'c1', val: 'existing' },
        { id: '2', customerId: 'c2', val: 'keep' }
    ];
    const incoming = { id: '3', customerId: 'c1', val: 'update' }; // Update for c1
    
    const output = mergeRequest(current, incoming);
    
    assert.strictEqual(output.length, 2, 'Should still have 2 items');
    const c1 = output.find(x => x.customerId === 'c1');
    assert.strictEqual(c1.id, '3', 'Should update ID');
    assert.strictEqual(c1.val, 'update', 'Should update value');
    
    const c2 = output.find(x => x.customerId === 'c2');
    assert.strictEqual(c2.val, 'keep', 'Should keep other customers');
    console.log('PASSED');
}

// Test 3: Merge distinct request
{
    console.log('Test 3: Merge distinct request');
    const current = [
        { id: '1', customerId: 'c1' }
    ];
    const incoming = { id: '2', customerId: 'c2' };
    
    const output = mergeRequest(current, incoming);
    assert.strictEqual(output.length, 2, 'Should have 2 items');
    console.log('PASSED');
}

console.log('ALL TESTS PASSED');
